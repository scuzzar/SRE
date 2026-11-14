import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GlobeView, LogItem } from '../../controller';
import { HappenedList } from './HappenedList';
import { useGame } from '../game-context';
import { CloseIcon } from '../icons';
import { cellAt, radiusOf, renderGlobe, screenOf, type Camera } from './globe-render';

/** Wie weit man hineinzoomen kann: etwa 10 Felder über die Breite. */
function maxZoom(globe: GlobeView): number {
  return Math.max(2, (5 * globe.grid.n) / (10 * Math.PI) / 0.46);
}

const DEG = Math.PI / 180;

/**
 * Der Globus einer Welt im Vordergrund, über ihrer Weltkarte: drehen mit dem Finger, zoomen mit zwei
 * Fingern oder dem Mausrad, Antippen zeigt, was im Feld ist. Darunter die Städte und Vulkane; ein
 * Tippen dreht den Globus dorthin. Wohin er schaut, ist reine Darstellung; welches Feld angetippt
 * ist, hält der Controller.
 */
export function GlobeScreen({ globe, log, logDays, error }: { globe: GlobeView; log: readonly LogItem[]; logDays: readonly (string | undefined)[]; error: string | undefined }) {
  const game = useGame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(320);
  const [camera, setCamera] = useState<Camera>(() => {
    const capital = globe.partyCell ?? globe.cities.find((c) => c.cell !== undefined)?.cell;
    return capital === undefined ? { lat: 15 * DEG, lon: 0, zoom: 1 } : { lat: globe.grid.lat[capital]! * DEG, lon: globe.grid.lon[capital]! * DEG, zoom: 1 };
  });
  const [moving, setMoving] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [confirmReroll, setConfirmReroll] = useState(false);
  const [npcToMove, setNpcToMove] = useState('');

  // Die Größe des Canvas folgt dem Platz (quadratisch).
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setSize(Math.max(160, Math.floor(Math.min(el.clientWidth, el.clientHeight || el.clientWidth))));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Zeichnen: beim Bewegen in halber Auflösung, danach scharf.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(size * (moving ? Math.min(1, dpr) * 0.6 : dpr));
    el.width = px;
    el.height = px;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(px, px);
    renderGlobe(img, globe, camera, showGrid);
    ctx.putImageData(img, 0, 0);
    drawMarkers(ctx, globe, camera, px);
  }, [globe, camera, size, moving, showGrid]);

  // Drehen, Zoomen, Antippen.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; pinch?: number; zoom?: number }>({ moved: 0 });
  const zoomBy = useCallback(
    (factor: number) => setCamera((c) => ({ ...c, zoom: Math.min(maxZoom(globe), Math.max(1, c.zoom * factor)) })),
    [globe],
  );
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { moved: 0 };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
      gesture.current = { moved: 99, pinch: Math.hypot(a.x - b.x, a.y - b.y), zoom: camera.zoom };
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
      const ratio = Math.hypot(a.x - b.x, a.y - b.y) / gesture.current.pinch;
      setMoving(true);
      setCamera((c) => ({ ...c, zoom: Math.min(maxZoom(globe), Math.max(1, (gesture.current.zoom ?? 1) * ratio)) }));
      return;
    }
    gesture.current.moved += Math.abs(dx) + Math.abs(dy);
    if (gesture.current.moved < 6) return;
    setMoving(true);
    const R = radiusOf(size, camera);
    setCamera((c) => ({ ...c, lon: c.lon - dx / R / Math.max(0.2, Math.cos(c.lat)), lat: Math.max(-85 * DEG, Math.min(85 * DEG, c.lat + dy / R)) }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const tap = gesture.current.moved < 6 && pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) setMoving(false);
    if (!tap) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cell = cellAt(globe, camera, size, e.clientX - rect.left, e.clientY - rect.top);
    game.pickCell(cell === globe.picked?.cell ? undefined : cell);
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

  const flyTo = (cell: number) => {
    setCamera((c) => ({ lat: globe.grid.lat[cell]! * DEG, lon: globe.grid.lon[cell]! * DEG, zoom: Math.max(c.zoom, Math.min(maxZoom(globe), 3)) }));
    game.pickCell(cell);
  };

  const picked = globe.picked;
  return (
    <div className="overlay globe-overlay">
      <section className="sheet globe-sheet" role="dialog" aria-modal="true" aria-labelledby="globe-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="globe-title">Globus · {globe.name}</h2>
          <span className="header-right">
            <button type="button" className={showGrid ? 'compact primary' : 'ghost compact'} aria-pressed={showGrid} onClick={() => setShowGrid(!showGrid)}>
              Gitter
            </button>
            <button data-escape type="button" className="icon-button" aria-label="Zur Weltkarte" onClick={() => game.closeGlobe()}>
              <CloseIcon />
            </button>
          </span>
        </div>
        <div className="sheet-body globe-body">
          <div className="globe-stage" ref={wrap}>
            <canvas
              ref={canvas}
              className="globe-canvas"
              style={{ width: size, height: size }}
              role="img"
              aria-label={`Globus von ${globe.name}; ziehen zum Drehen, antippen für ein Feld`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            <div className="globe-zoom">
              <button type="button" className="ghost compact" aria-label="Hineinzoomen" onClick={() => zoomBy(1.5)}>
                +
              </button>
              <button type="button" className="ghost compact" aria-label="Herauszoomen" onClick={() => zoomBy(1 / 1.5)}>
                −
              </button>
            </div>
          </div>
          <p className="globe-scale">1 Feld ≈ {globe.cellKm} km</p>
          {picked && (
            <section className="career globe-picked" aria-label="Angetipptes Feld" aria-live="polite">
              <div className="career-term">
                <h4>
                  {picked.landform} · {picked.position}
                </h4>
                <ul>
                  <li>{picked.temperature}</li>
                  {picked.cities.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                  {picked.towns > 0 && <li>{picked.towns === 1 ? '1 Kleinstadt' : `${picked.towns} Kleinstädte`}</li>}
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
                {picked.happened.length > 0 && <HappenedList title="Was hier geschah" indices={picked.happened} log={log} logDays={logDays} />}
              </div>
            </section>
          )}
          {globe.cities.length > 0 && (
            <section className="career globe-list" aria-label="Städte">
              <div className="career-term">
                <h4>Städte</h4>
                <ul>
                  {globe.cities.map((c) => (
                    <li key={c.index}>
                      {c.cell === undefined ? (
                        <span>
                          {c.label} · {c.detail}
                        </span>
                      ) : (
                        <button type="button" className="link-button" onClick={() => flyTo(c.cell!)}>
                          {c.label} · {c.detail}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
          {globe.volcanoes.length > 0 && (
            <section className="career globe-list" aria-label="Vulkane">
              <div className="career-term">
                <h4>Vulkane</h4>
                <ul>
                  {globe.volcanoes.map((v, i) => (
                    <li key={v.cell}>
                      <button type="button" className="link-button" onClick={() => flyTo(v.cell)}>
                        {v.label} {i + 1}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
        <div className="sheet-foot">
          {confirmReroll ? (
            <>
              <span className="combat-hint">Die ganze Karte neu würfeln?</span>
              <button
                type="button"
                className="ghost danger compact"
                onClick={() => {
                  setConfirmReroll(false);
                  game.rerollMap();
                }}
              >
                Ja, neu würfeln
              </button>
              <button type="button" className="ghost compact" onClick={() => setConfirmReroll(false)}>
                Abbrechen
              </button>
            </>
          ) : globe.rerollBlocker ? (
            <span className="combat-hint">{globe.rerollBlocker}</span>
          ) : (
            <button type="button" className="ghost compact" onClick={() => setConfirmReroll(true)}>
              Neu würfeln
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/** Zeichen auf dem Globus: Städte als Lichtpunkte, Vulkane als Dreiecke, Ereignisse, NSC, die Gruppe, das angetippte Feld als Ring. */
function drawMarkers(ctx: CanvasRenderingContext2D, globe: GlobeView, camera: Camera, px: number): void {
  const scale = px / 320;
  const badge = (cell: number, dx: number, dy: number, fill: string, text: string) => {
    const at = screenOf(globe, camera, px, cell);
    if (!at) return;
    const r = 6 * scale;
    const x = at.x + dx * scale;
    const y = at.y + dy * scale;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.strokeStyle = 'rgba(15,15,15,0.9)';
    ctx.lineWidth = scale;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = `bold ${Math.round(8 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5 * scale);
  };
  for (const v of globe.volcanoes) {
    const at = screenOf(globe, camera, px, v.cell);
    if (!at) continue;
    const s = 4.5 * scale;
    ctx.beginPath();
    ctx.moveTo(at.x, at.y - s);
    ctx.lineTo(at.x + s, at.y + s * 0.8);
    ctx.lineTo(at.x - s, at.y + s * 0.8);
    ctx.closePath();
    ctx.fillStyle = 'rgba(214,64,36,0.95)';
    ctx.strokeStyle = 'rgba(30,10,5,0.8)';
    ctx.lineWidth = scale;
    ctx.fill();
    ctx.stroke();
  }
  for (const c of globe.cities) {
    if (c.cell === undefined) continue;
    const at = screenOf(globe, camera, px, c.cell);
    if (!at) continue;
    const r = (c.rank === 'primary' ? 3.6 : 2.4) * scale;
    ctx.beginPath();
    ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
    ctx.fillStyle = c.index === 0 ? 'rgba(255,214,90,1)' : 'rgba(255,240,200,0.95)';
    ctx.strokeStyle = 'rgba(20,20,20,0.85)';
    ctx.lineWidth = scale;
    ctx.fill();
    ctx.stroke();
  }
  for (const e of globe.events) badge(e.cell, 7, -7, 'rgba(255,170,60,0.95)', e.count > 9 ? '9+' : String(e.count));
  const npcCells = new Map<number, number>();
  for (const n of globe.npcs) if (n.cell !== undefined) npcCells.set(n.cell, (npcCells.get(n.cell) ?? 0) + 1);
  for (const [cell, count] of npcCells) badge(cell, -7, -7, 'rgba(190,150,255,0.95)', count > 1 ? String(count) : 'N');
  if (globe.partyCell !== undefined) badge(globe.partyCell, 0, 9, 'rgba(110,200,255,1)', 'G');
  const picked = globe.picked?.cell;
  if (picked !== undefined) {
    const at = screenOf(globe, camera, px, picked);
    if (at) {
      ctx.beginPath();
      ctx.arc(at.x, at.y, 8 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
    }
  }
}
