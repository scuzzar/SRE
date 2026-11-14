import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GlobeView, LogItem } from '../../controller';
import { useGame } from '../game-context';
import { CloseIcon, PencilIcon } from '../icons';
import { cellAt, radiusOf, renderGlobe, screenOf, type Camera, type Viewport } from './globe-render';
import { HappenedList } from './HappenedList';

const DEG = Math.PI / 180;
/** So lange wartet ein Tippen auf ein zweites (Doppeltippen zoomt statt zu wählen). */
const DOUBLE_TAP_MS = 260;

/** Der kürzere Weg um die Kugel für einen Unterschied der Länge (Bogenmaß). */
function shortest(delta: number): number {
  return ((((delta + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

/** Wie weit man hineinzoomen kann: etwa 10 Felder über die kürzere Seite. */
function maxZoom(globe: GlobeView): number {
  return Math.max(2, (5 * globe.grid.n) / (10 * Math.PI) / 0.46);
}

type Panel = 'places' | 'logs' | undefined;

/**
 * Der Globus einer Welt wie eine Karten-App: Die Karte füllt den ganzen Bildschirm. Oben eine Leiste
 * mit Zurück, Name und zwei aufklappbaren Listen (Orte: Städte, Vulkane, Gruppe, NSC; Einträge: die
 * Felder mit Logeinträgen). Unten fährt ein Feld herein, sobald ein Feld angetippt ist, mit allem, was
 * dort ist, und dem, was dort geschah. Wohin die Karte schaut und welche Liste offen ist, ist reine
 * Darstellung; welches Feld angetippt ist, hält der Controller.
 */
export function GlobeScreen({ globe, log, logDays, error }: { globe: GlobeView; log: readonly LogItem[]; logDays: readonly (string | undefined)[]; error: string | undefined }) {
  const game = useGame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<Viewport>({ width: 390, height: 700 });
  const [camera, setCamera] = useState<Camera>(() => {
    const start = globe.partyCell ?? globe.cities.find((c) => c.cell !== undefined)?.cell;
    return start === undefined ? { lat: 15 * DEG, lon: 0, zoom: 1 } : { lat: globe.grid.lat[start]! * DEG, lon: globe.grid.lon[start]! * DEG, zoom: 1.4 };
  });
  const [moving, setMoving] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [panel, setPanel] = useState<Panel>(undefined);
  const [confirmReroll, setConfirmReroll] = useState(false);
  const [npcToMove, setNpcToMove] = useState('');
  const [renaming, setRenaming] = useState<number | undefined>(undefined);
  const [newName, setNewName] = useState('');

  // Die Karte füllt den Platz.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setView({ width: Math.max(160, el.clientWidth), height: Math.max(160, el.clientHeight) });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Zeichnen: beim Bewegen in geringerer Auflösung, danach scharf.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scale = moving ? Math.min(1, dpr) * 0.55 : dpr;
    const w = Math.round(view.width * scale);
    const h = Math.round(view.height * scale);
    el.width = w;
    el.height = h;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(w, h);
    renderGlobe(img, globe, camera, showGrid);
    ctx.putImageData(img, 0, 0);
    drawMarkers(ctx, globe, camera, { width: w, height: h }, scale);
  }, [globe, camera, view, moving, showGrid]);

  // Drehen, Zoomen, Antippen.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; pinch?: number; zoom?: number; double?: boolean; startY?: number }>({ moved: 0 });
  const clampZoom = useCallback((z: number) => Math.min(maxZoom(globe), Math.max(1, z)), [globe]);
  const zoomBy = useCallback((factor: number) => setCamera((c) => ({ ...c, zoom: clampZoom(c.zoom * factor) })), [clampZoom]);
  // Die Knöpfe gleiten: Ziel merken und in wenigen Bildern hinzoomen, solange in grober Auflösung.
  const zoomTarget = useRef<number | undefined>(undefined);
  const zoomFrame = useRef(0);
  const glideZoom = (factor: number) => {
    const target = clampZoom((zoomTarget.current ?? camera.zoom) * factor);
    zoomTarget.current = target;
    cancelAnimationFrame(zoomFrame.current);
    setMoving(true);
    let zoom = camera.zoom;
    const step = () => {
      zoom += (target - zoom) * 0.35;
      const done = Math.abs(target - zoom) < 0.01 * target;
      if (done) zoom = target;
      setCamera((c) => ({ ...c, zoom }));
      if (done) {
        zoomTarget.current = undefined;
        setMoving(false);
      } else zoomFrame.current = requestAnimationFrame(step);
    };
    zoomFrame.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(zoomFrame.current), []);
  // Die Knöpfe stehen über dem Infofeld unten, so hoch, wie es wirklich ist.
  const sheet = useRef<HTMLElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  useLayoutEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const measure = () => setSheetHeight(el.classList.contains('open') ? el.offsetHeight : 0);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [globe.picked]);
  // Gesten wie in einer Karten-App: ziehen dreht, zwei Finger zoomen, Doppeltippen zoomt auf die
  // Stelle hinein, Doppeltippen und Ziehen zoomt einhändig (nach unten hinein, nach oben heraus).
  // Ein einfaches Tippen wählt das Feld erst, wenn kein zweites Tippen folgt.
  const lastTap = useRef<{ x: number; y: number; at: number } | undefined>(undefined);
  const pendingTap = useRef<number | undefined>(undefined);
  const cancelPendingTap = () => {
    if (pendingTap.current !== undefined) window.clearTimeout(pendingTap.current);
    pendingTap.current = undefined;
  };
  useEffect(() => cancelPendingTap, []);
  const pointAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { moved: 0 };
    if (pointers.current.size === 2) {
      cancelPendingTap();
      lastTap.current = undefined;
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
      gesture.current = { moved: 99, pinch: Math.hypot(a.x - b.x, a.y - b.y), zoom: camera.zoom };
      return;
    }
    const before = lastTap.current;
    if (before && e.timeStamp - before.at < DOUBLE_TAP_MS && Math.hypot(e.clientX - before.x, e.clientY - before.y) < 30) {
      // Zweites Tippen: das erste wählt kein Feld mehr.
      cancelPendingTap();
      lastTap.current = undefined;
      gesture.current = { moved: 0, double: true, startY: e.clientY, zoom: camera.zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const last = pointers.current.get(e.pointerId);
    if (!last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && gesture.current.pinch) {
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
      setMoving(true);
      setCamera((c) => ({ ...c, zoom: clampZoom((gesture.current.zoom ?? 1) * (Math.hypot(a.x - b.x, a.y - b.y) / gesture.current.pinch!)) }));
      return;
    }
    gesture.current.moved += Math.abs(dx) + Math.abs(dy);
    if (gesture.current.moved < 6) return;
    setMoving(true);
    setPanel(undefined);
    if (gesture.current.double) {
      const start = gesture.current.zoom ?? camera.zoom;
      const travel = e.clientY - (gesture.current.startY ?? e.clientY);
      setCamera((c) => ({ ...c, zoom: clampZoom(start * Math.exp(travel / 160)) }));
      return;
    }
    const R = radiusOf(view, camera);
    setCamera((c) => ({ ...c, lon: c.lon - dx / R / Math.max(0.2, Math.cos(c.lat)), lat: Math.max(-85 * DEG, Math.min(85 * DEG, c.lat + dy / R)) }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const tap = gesture.current.moved < 6 && pointers.current.size === 1;
    const double = gesture.current.double === true;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) setMoving(false);
    if (!tap) return;
    setPanel(undefined);
    const point = pointAt(e);
    const cell = cellAt(globe, camera, view, point.x, point.y);
    if (double) {
      // Doppeltippen: auf die Stelle zu drehen und eine Stufe hineinzoomen.
      if (cell !== undefined) {
        const lat = globe.grid.lat[cell]! * DEG;
        const lon = globe.grid.lon[cell]! * DEG;
        setCamera((c) => ({ lat: c.lat + (lat - c.lat) * 0.5, lon: c.lon + shortest(lon - c.lon) * 0.5, zoom: c.zoom }));
      }
      glideZoom(2);
      return;
    }
    lastTap.current = { x: e.clientX, y: e.clientY, at: e.timeStamp };
    cancelPendingTap();
    pendingTap.current = window.setTimeout(() => {
      pendingTap.current = undefined;
      game.pickCell(cell === globe.picked?.cell ? undefined : cell);
    }, DOUBLE_TAP_MS);
  };
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  /** Dreht die Karte zu einem Feld, zoomt etwas hinein und tippt es an. */
  const flyTo = (cell: number) => {
    setCamera((c) => ({ lat: globe.grid.lat[cell]! * DEG, lon: globe.grid.lon[cell]! * DEG, zoom: Math.max(c.zoom, clampZoom(3)) }));
    setPanel(undefined);
    game.pickCell(cell);
  };

  const picked = globe.picked;
  const toggle = (p: Panel) => setPanel(panel === p ? undefined : p);
  return (
    <div className="globe-full" role="dialog" aria-modal="true" aria-label={`Globus · ${globe.name}`}>
      <div className="globe-stage" ref={stage}>
        <canvas
          ref={canvas}
          className="globe-canvas"
          role="img"
          aria-label={`Globus von ${globe.name}; ziehen zum Drehen, antippen für ein Feld`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      <div className="globe-top">
        <div className="globe-bar">
          <button data-escape type="button" className="globe-round" aria-label="Zur Weltkarte" onClick={() => game.closeGlobe()}>
            <CloseIcon />
          </button>
          <span className="globe-title">{globe.name}</span>
          <button type="button" className={panel === 'places' ? 'globe-chip on' : 'globe-chip'} aria-expanded={panel === 'places'} onClick={() => toggle('places')}>
            Orte ▾
          </button>
          <button type="button" className={panel === 'logs' ? 'globe-chip on' : 'globe-chip'} aria-expanded={panel === 'logs'} onClick={() => toggle('logs')}>
            Einträge{globe.events.length > 0 ? ` ${globe.events.length}` : ''} ▾
          </button>
        </div>
        {panel === 'places' && (
          <div className="globe-panel" role="region" aria-label="Orte">
            {globe.partyCell !== undefined && (
              <button type="button" className="globe-row" onClick={() => flyTo(globe.partyCell!)}>
                <span className="globe-dot party">G</span> Die Gruppe
              </button>
            )}
            {globe.npcs.filter((n) => n.cell !== undefined).map((n) => (
              <button key={n.id} type="button" className="globe-row" onClick={() => flyTo(n.cell!)}>
                <span className="globe-dot npc">N</span> {n.name}
              </button>
            ))}
            {globe.cities.map((c) =>
              c.cell === undefined ? (
                <div key={c.index} className="globe-row static">
                  <span className="globe-dot orbit">○</span> {c.label} · {c.detail}
                </div>
              ) : (
                <button key={c.index} type="button" className="globe-row" onClick={() => flyTo(c.cell!)}>
                  <span className={c.index === 0 ? 'globe-dot capital' : 'globe-dot city'}>●</span>
                  <span className="globe-row-text">
                    {c.label}
                    <small>{c.detail}</small>
                  </span>
                </button>
              ),
            )}
            {globe.volcanoes.map((v, i) => (
              <button key={v.cell} type="button" className="globe-row" onClick={() => flyTo(v.cell)}>
                <span className="globe-dot volcano">▲</span> {v.label} {i + 1}
              </button>
            ))}
            <div className="globe-panel-foot">
              <label className="globe-check">
                <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> Hexgitter zeigen
              </label>
              <span className="globe-scale">1 Feld ≈ {globe.cellKm} km</span>
              {globe.rerollBlocker ? (
                <span className="combat-hint">{globe.rerollBlocker}</span>
              ) : confirmReroll ? (
                <span className="globe-actions">
                  <button
                    type="button"
                    className="ghost danger compact"
                    onClick={() => {
                      setConfirmReroll(false);
                      game.rerollMap();
                    }}
                  >
                    Ja, Karte neu würfeln
                  </button>
                  <button type="button" className="ghost compact" onClick={() => setConfirmReroll(false)}>
                    Abbrechen
                  </button>
                </span>
              ) : (
                <button type="button" className="ghost compact" onClick={() => setConfirmReroll(true)}>
                  Karte neu würfeln
                </button>
              )}
            </div>
          </div>
        )}
        {panel === 'logs' && (
          <div className="globe-panel" role="region" aria-label="Felder mit Einträgen">
            {globe.events.length === 0 && <p className="combat-hint">Auf dieser Welt ist noch nichts an einem Feld geschehen.</p>}
            {globe.events.map((e) => (
              <button key={e.cell} type="button" className="globe-row" onClick={() => flyTo(e.cell)}>
                <span className="globe-dot event">{e.count > 9 ? '9+' : e.count}</span>
                <span className="globe-row-text">
                  {e.label}
                  <small>
                    {e.count === 1 ? '1 Eintrag' : `${e.count} Einträge`}
                    {logDays[e.latest] ? ` · zuletzt ${logDays[e.latest]}` : ''}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="globe-zoom" style={sheetHeight > 0 ? { bottom: sheetHeight + 12 } : undefined}>
        <button type="button" className="globe-round" aria-label="Hineinzoomen" onClick={() => glideZoom(1.6)}>
          +
        </button>
        <button type="button" className="globe-round" aria-label="Herauszoomen" onClick={() => glideZoom(1 / 1.6)}>
          −
        </button>
      </div>

      <section ref={sheet} className={picked ? 'globe-sheet open' : 'globe-sheet'} aria-label="Angetipptes Feld" aria-hidden={!picked}>
        {picked && (
          <>
            <div className="globe-sheet-head">
              <span className="globe-handle" aria-hidden />
              {picked.cities[0] && renaming === picked.cities[0].index ? (
                <form
                  className="globe-rename"
                  onSubmit={(e) => {
                    e.preventDefault();
                    game.renameCity(renaming, newName);
                    setRenaming(undefined);
                  }}
                >
                  <input aria-label="Name der Stadt" value={newName} autoFocus onChange={(e) => setNewName(e.target.value)} />
                  <button type="submit" className="primary compact" disabled={!newName.trim()}>
                    OK
                  </button>
                </form>
              ) : (
                <h3>
                  {picked.cities[0]?.name ?? picked.landform}
                  {picked.cities[0] && (
                    <button
                      type="button"
                      className="icon-button globe-pencil"
                      aria-label="Stadt umbenennen"
                      onClick={() => {
                        setRenaming(picked.cities[0]!.index);
                        setNewName(picked.cities[0]!.name);
                      }}
                    >
                      <PencilIcon />
                    </button>
                  )}
                </h3>
              )}
              <button type="button" className="icon-button" aria-label="Feld schließen" onClick={() => game.pickCell(undefined)}>
                <CloseIcon />
              </button>
            </div>
            <p className="globe-sheet-sub">
              {picked.landform} · {picked.position} · {picked.temperature}
            </p>
            <ul className="globe-facts">
              {picked.cities.map((c, i) => (
                <li key={c.index}>{i === 0 ? c.detail : `${c.name}: ${c.detail}`}</li>
              ))}
              {picked.towns > 0 && <li>Kleinstadt</li>}
              {picked.volcano && <li>{picked.volcano}</li>}
              {picked.river && <li>Fluss</li>}
              {picked.road && <li>Straße</li>}
              {globe.partyCell === picked.cell && <li>Die Gruppe ist hier</li>}
              {picked.npcs.map((n) => (
                <li key={n}>NSC: {n}</li>
              ))}
            </ul>
            <div className="globe-actions">
              {globe.partyHere && globe.partyCell !== picked.cell && (
                <button type="button" className="primary compact" onClick={() => game.moveParty()}>
                  {picked.city === undefined ? 'Gruppe hierher' : 'Gruppe in diese Stadt'}
                </button>
              )}
              {globe.npcs.length > 0 && (
                <span className="globe-move-npc">
                  <select aria-label="NSC wählen" value={npcToMove} onChange={(e) => setNpcToMove(e.target.value)}>
                    <option value="">NSC …</option>
                    {globe.npcs.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="ghost compact" disabled={!npcToMove} onClick={() => game.moveNpc(npcToMove)}>
                    hierher
                  </button>
                </span>
              )}
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {picked.happened.length > 0 ? <HappenedList title="Was hier geschah" indices={picked.happened} log={log} logDays={logDays} /> : <p className="combat-hint">Hier ist noch nichts geschehen.</p>}
          </>
        )}
      </section>
    </div>
  );
}

/** Zeichen auf dem Globus: Städte, Vulkane, Ereignisse, NSC, die Gruppe, das angetippte Feld als Ring. */
function drawMarkers(ctx: CanvasRenderingContext2D, globe: GlobeView, camera: Camera, view: Viewport, scale: number): void {
  const at = (cell: number) => screenOf(globe, camera, view, cell);
  const badge = (cell: number, dx: number, dy: number, fill: string, text: string) => {
    const p = at(cell);
    if (!p) return;
    const r = 7 * scale;
    const x = p.x + dx * scale;
    const y = p.y + dy * scale;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.strokeStyle = 'rgba(15,15,15,0.9)';
    ctx.lineWidth = scale;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = `bold ${Math.round(9 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5 * scale);
  };
  for (const v of globe.volcanoes) {
    const p = at(v.cell);
    if (!p) continue;
    const s = 5 * scale;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - s);
    ctx.lineTo(p.x + s, p.y + s * 0.8);
    ctx.lineTo(p.x - s, p.y + s * 0.8);
    ctx.closePath();
    ctx.fillStyle = 'rgba(214,64,36,0.95)';
    ctx.strokeStyle = 'rgba(30,10,5,0.8)';
    ctx.lineWidth = scale;
    ctx.fill();
    ctx.stroke();
  }
  for (const c of globe.cities) {
    if (c.cell === undefined) continue;
    const p = at(c.cell);
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (c.rank === 'primary' ? 4 : 2.6) * scale, 0, Math.PI * 2);
    ctx.fillStyle = c.index === 0 ? 'rgba(255,214,90,1)' : 'rgba(255,240,200,0.95)';
    ctx.strokeStyle = 'rgba(20,20,20,0.85)';
    ctx.lineWidth = scale;
    ctx.fill();
    ctx.stroke();
  }
  // Namen wie auf einer Karte: ab etwas Zoom die Hauptstädte, weiter hinein alle Städte.
  if (camera.zoom >= 1.8) {
    ctx.font = `600 ${Math.round(11 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const c of globe.cities) {
      if (c.cell === undefined || (c.rank !== 'primary' && camera.zoom < 3)) continue;
      const p = at(c.cell);
      if (!p) continue;
      const x = p.x + 13 * scale;
      ctx.lineWidth = 3 * scale;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(c.label, x, p.y);
      ctx.fillStyle = 'rgba(255,248,225,0.98)';
      ctx.fillText(c.label, x, p.y);
    }
  }
  for (const e of globe.events) badge(e.cell, 8, -8, 'rgba(255,170,60,0.95)', e.count > 9 ? '9+' : String(e.count));
  const npcCells = new Map<number, number>();
  for (const n of globe.npcs) if (n.cell !== undefined) npcCells.set(n.cell, (npcCells.get(n.cell) ?? 0) + 1);
  for (const [cell, count] of npcCells) badge(cell, -8, -8, 'rgba(190,150,255,0.95)', count > 1 ? String(count) : 'N');
  if (globe.partyCell !== undefined) badge(globe.partyCell, 0, 10, 'rgba(110,200,255,1)', 'G');
  const picked = globe.picked?.cell;
  if (picked !== undefined) {
    const p = at(picked);
    if (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2.5 * scale;
      ctx.stroke();
    }
  }
}
