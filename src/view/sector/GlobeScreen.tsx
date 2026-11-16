import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { landformAt, type GlobeView, type LogItem, type TripPlanView, type TripView, type WorldView } from '../../controller';
import { TripHint, TripPlanCard } from './TripPanels';
import { roleText } from '../format';
import { useGame } from '../game-context';
import { CloseIcon, LocateIcon, PencilIcon } from '../icons';
import { createGlobeRenderer, type GlobeRenderer } from './globe-gl';
import { hideLoading, showLoading } from '../loading';
import { cellAt, radiusOf, renderGlobe, screenOf, screenOfPoint, type Camera, type Viewport } from './globe-render';
import { HappenedList } from './HappenedList';
import { trayTop } from '../Tray';
import { NoteSection, SurfaceSection, WorldActions, WorldCard } from './WorldSheet';

const DEG = Math.PI / 180;
const LOADING = 'Welt wird aufgebaut …';
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

type Panel = 'world' | 'places' | 'logs' | undefined;

/**
 * Der Globus einer Welt wie eine Karten-App, die Grundkarte unter allem: Die Karte füllt ihre Fläche
 * (auf dem Smartphone liegt unten das Ziehblatt darüber). Oben eine Leiste mit Schließen (zum
 * Subsektor, ebenso ganz herausgezoomt), Name und UWP (klappt die Welt im Klartext auf, mit
 * Oberfläche, Aufenthalt, Reise und Notiz) und zwei aufklappbaren Listen (Orte: Städte, Vulkane,
 * Gruppe, NSC; Einträge: die Felder mit Logeinträgen). Ein angetipptes Feld zeigt `FieldCard` im
 * Ziehblatt bzw. im Panel neben dem Log. Wohin die Karte schaut und welche Liste offen ist, ist reine
 * Darstellung; welches Feld angetippt ist, hält der Controller.
 */
export function GlobeScreen({
  globe,
  world,
  here,
  travel,
  log,
  logDays,
  trip,
}: {
  globe: GlobeView;
  world: WorldView | undefined;
  here: boolean;
  travel: { readonly blocker: string | undefined } | undefined;
  log: readonly LogItem[];
  logDays: readonly (string | undefined)[];
  trip: TripView | undefined;
}) {
  const game = useGame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const base = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<GlobeRenderer | null | undefined>(undefined);
  const building = useRef(false);
  const firstFrame = useRef(false);
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

  // Verliert der Browser den Grafikkontext (etwa bei einer Systemgeste oder knappem Speicher), zeichnet
  // sofort der Prozessor weiter; kommt der Kontext zurück, entsteht WebGL neu.
  const [glEpoch, setGlEpoch] = useState(0);
  useEffect(() => {
    const under = base.current;
    if (!under) return;
    const lost = (e: Event) => {
      e.preventDefault();
      renderer.current = null;
      setGlEpoch((n) => n + 1);
    };
    const restored = () => {
      renderer.current = undefined;
      setGlEpoch((n) => n + 1);
    };
    under.addEventListener('webglcontextlost', lost);
    under.addEventListener('webglcontextrestored', restored);
    return () => {
      under.removeEventListener('webglcontextlost', lost);
      under.removeEventListener('webglcontextrestored', restored);
    };
  }, []);

  // Zeichnen: die Kugel mit WebGL in voller Auflösung, auch beim Ziehen; darüber die Zeichen. Ohne
  // WebGL rechnet der Prozessor die Kugel, beim Bewegen dann in geringerer Auflösung.
  useEffect(() => {
    const el = canvas.current;
    const under = base.current;
    if (!el || !under) return;
    // Die Grafik entsteht in Schritten; solange zeigt der Ladebalken den Fortschritt.
    if (renderer.current === undefined && !building.current) {
      building.current = true;
      showLoading(LOADING, 0.4, 'globe');
      void createGlobeRenderer(under, globe, (done) => showLoading(LOADING, 0.4 + 0.6 * done, 'globe')).then((made) => {
        renderer.current = made ?? null;
        building.current = false;
        // Der Balken geht erst nach dem ersten echten Bild (siehe unten).
        firstFrame.current = true;
        setGlEpoch((n) => n + 1);
      });
    }
    if (building.current) return;
    const gl = renderer.current ?? null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scale = gl || !moving ? dpr : Math.min(1, dpr) * 0.55;
    const w = Math.round(view.width * scale);
    const h = Math.round(view.height * scale);
    if (el.width !== w) el.width = w;
    if (el.height !== h) el.height = h;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (gl) {
      if (under.width !== w) under.width = w;
      if (under.height !== h) under.height = h;
      gl.draw(globe, camera, { width: w, height: h }, showGrid, globe.picked?.cell);
    } else {
      const img = ctx.createImageData(w, h);
      renderGlobe(img, globe, camera, showGrid);
      ctx.putImageData(img, 0, 0);
    }
    drawMarkers(ctx, globe, camera, { width: w, height: h }, scale, !gl);
    if (firstFrame.current) {
      firstFrame.current = false;
      gl?.finish();
      requestAnimationFrame(() => hideLoading('globe'));
    }
  }, [globe, camera, view, moving, showGrid, glEpoch]);

  // Drehen, Zoomen, Antippen.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; pinch?: number; zoom?: number; double?: boolean; startY?: number }>({ moved: 0 });
  const clampZoom = useCallback((z: number) => (Number.isFinite(z) ? Math.min(maxZoom(globe), Math.max(1, z)) : 1), [globe]);
  const zoomBy = useCallback((factor: number) => setCamera((c) => ({ ...c, zoom: clampZoom(c.zoom * factor) })), [clampZoom]);
  // Ganz herausgezoomt geht es weiter hinaus zum Subsektor, wie in einer Karten-App: mit −, mit dem
  // Mausrad (ein paar Rasten am Anschlag) oder mit zwei Fingern (deutlich weiter zusammen als am Anschlag).
  const leaving = useRef(false);
  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    game.closeWorld();
  }, [game]);
  const zoomNow = useRef(camera.zoom);
  useEffect(() => {
    zoomNow.current = camera.zoom;
  }, [camera.zoom]);
  const wheelOut = useRef({ count: 0, at: 0 });
  const pinchFloor = useRef<number | undefined>(undefined);
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
  /** Zwei Finger: Kneifen beginnt beim jetzigen Abstand und Zoom (auch wenn ein dritter Finger gerade abhebt). */
  const startPinch = () => {
    pinchFloor.current = undefined;
    const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
    gesture.current = { moved: 99, pinch: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: camera.zoom };
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { moved: 0 };
    if (pointers.current.size >= 2) {
      cancelPendingTap();
      lastTap.current = undefined;
      // Ab drei Fingern tut die Karte nichts (Systemgesten wie der Screenshot mit drei Fingern).
      if (pointers.current.size === 2) startPinch();
      else gesture.current = { moved: 99 };
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
    if (pointers.current.size > 2) return;
    if (pointers.current.size === 2 && !gesture.current.pinch) startPinch();
    if (pointers.current.size === 2 && gesture.current.pinch) {
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
      setMoving(true);
      // Sofort rechnen, nicht erst im Updater: Bis React ihn ausführt, kann die Geste schon zurückgesetzt sein.
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const wanted = (gesture.current.zoom ?? camera.zoom) * (distance / gesture.current.pinch);
      const zoom = clampZoom(wanted);
      if (zoom <= 1 && wanted < 1) {
        if (pinchFloor.current === undefined) pinchFloor.current = distance;
        else if (distance < pinchFloor.current * 0.7) leave();
      } else pinchFloor.current = undefined;
      // Am Anschlag neu ansetzen: Wer weiter spreizt und dann zurückkneift, zoomt sofort wieder heraus.
      if (zoom !== wanted) gesture.current = { ...gesture.current, pinch: distance, zoom };
      setCamera((c) => ({ ...c, zoom }));
      return;
    }
    gesture.current.moved += Math.abs(dx) + Math.abs(dy);
    if (gesture.current.moved < 6) return;
    setMoving(true);
    setPanel(undefined);
    if (gesture.current.double) {
      const start = gesture.current.zoom ?? camera.zoom;
      const travel = e.clientY - (gesture.current.startY ?? e.clientY);
      const wanted = start * Math.exp(travel / 160);
      const zoom = clampZoom(wanted);
      // Auch hier am Anschlag neu ansetzen, damit die Gegenrichtung sofort wirkt.
      if (zoom !== wanted) gesture.current = { ...gesture.current, zoom, startY: e.clientY };
      setCamera((c) => ({ ...c, zoom }));
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
    // Hebt ein Finger von mehreren ab, geht es mit den übrigen weiter, ohne Sprung und ohne Antippen.
    if (pointers.current.size === 2) startPinch();
    if (pointers.current.size === 1) gesture.current = { moved: 99 };
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
      if (e.deltaY > 0 && zoomNow.current <= 1) {
        const out = wheelOut.current;
        out.count = e.timeStamp - out.at < 500 ? out.count + 1 : 1;
        out.at = e.timeStamp;
        if (out.count >= 4) leave();
        return;
      }
      wheelOut.current.count = 0;
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy, leave]);

  /** Wie im Navi: gleitet zur Gruppe zurück und zoomt so weit hinein, dass man die Umgebung sieht. */
  const flyFrame = useRef(0);
  const flyToParty = () => {
    const cell = globe.partyCell;
    if (cell === undefined) return;
    cancelAnimationFrame(flyFrame.current);
    const from = camera;
    const lat = globe.grid.lat[cell]! * DEG;
    const dLon = shortest(globe.grid.lon[cell]! * DEG - from.lon);
    const zoom = Math.max(from.zoom, clampZoom(3));
    const start = performance.now();
    setMoving(true);
    setPanel(undefined);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 450);
      const e = 1 - (1 - t) ** 3;
      setCamera({ lat: from.lat + (lat - from.lat) * e, lon: from.lon + dLon * e, zoom: from.zoom + (zoom - from.zoom) * e });
      if (t < 1) flyFrame.current = requestAnimationFrame(step);
      else setMoving(false);
    };
    flyFrame.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(flyFrame.current), []);

  // Ein angetipptes Feld, das hinter dem hochfahrenden Ziehblatt verschwände, dreht die Karte in die
  // Mitte (sie liegt immer über dem halben Blatt). Gemessen wird, wenn das Blatt seine Stufe hat.
  const seen = useRef({ camera, view });
  useEffect(() => {
    seen.current = { camera, view };
  });
  const pickedCell = globe.picked?.cell;
  useEffect(() => {
    if (pickedCell === undefined) return;
    const timer = window.setTimeout(() => {
      const el = stage.current;
      if (!el) return;
      const { camera: from, view: size } = seen.current;
      const at = screenOf(globe, from, size, pickedCell);
      const r = el.getBoundingClientRect();
      const bottom = trayTop(el);
      // Steht das Blatt ganz oben, ist vom Globus kaum etwas zu sehen; dann bleibt er, wie er ist.
      if (bottom - r.top < 160 || (at && r.top + at.y < bottom - 28)) return;
      cancelAnimationFrame(flyFrame.current);
      const lat = globe.grid.lat[pickedCell]! * DEG;
      const dLon = shortest(globe.grid.lon[pickedCell]! * DEG - from.lon);
      const start = performance.now();
      setMoving(true);
      const glide = (now: number) => {
        const t = Math.min(1, (now - start) / 380);
        const e = 1 - (1 - t) ** 3;
        setCamera((c) => ({ ...c, lat: from.lat + (lat - from.lat) * e, lon: from.lon + dLon * e }));
        if (t < 1) flyFrame.current = requestAnimationFrame(glide);
        else setMoving(false);
      };
      flyFrame.current = requestAnimationFrame(glide);
    }, 90);
    return () => window.clearTimeout(timer);
    // Nur ein neu angetipptes Feld zählt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedCell]);

  /** Dreht die Karte zu einem Feld, zoomt etwas hinein und tippt es an. */
  const flyTo = (cell: number) => {
    setCamera((c) => ({ lat: globe.grid.lat[cell]! * DEG, lon: globe.grid.lon[cell]! * DEG, zoom: Math.max(c.zoom, clampZoom(3)) }));
    setPanel(undefined);
    game.pickCell(cell);
  };

  const toggle = (p: Panel) => setPanel(panel === p ? undefined : p);
  return (
    <div className="globe-full" role="region" aria-label={`Globus · ${globe.name}`}>
      <div className="globe-stage" ref={stage}>
        <canvas ref={base} className="globe-canvas globe-base" aria-hidden />
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
          <button type="button" className="globe-round" aria-label="Schließen" title="Zum Subsektor" onClick={() => game.closeWorld()}>
            <CloseIcon />
          </button>
          <button type="button" className={panel === 'world' ? 'globe-title on' : 'globe-title'} aria-expanded={panel === 'world'} aria-label={`${globe.name}, UWP ${world?.uwp ?? ''}: die Welt im Klartext`} onClick={() => toggle('world')}>
            <span className="globe-title-name">{globe.name}</span>
            {world && <span className="mono globe-title-uwp">{world.uwp} ▾</span>}
          </button>
          <button type="button" className={panel === 'places' ? 'globe-chip on' : 'globe-chip'} aria-expanded={panel === 'places'} onClick={() => toggle('places')}>
            Orte ▾
          </button>
          <button type="button" className={panel === 'logs' ? 'globe-chip on' : 'globe-chip'} aria-expanded={panel === 'logs'} onClick={() => toggle('logs')}>
            Einträge{globe.events.length > 0 ? ` ${globe.events.length}` : ''} ▾
          </button>
        </div>
        {trip && globe.partyHere && panel === undefined && <TripHint trip={trip} />}
        {panel === 'world' && world && (
          <div className="globe-panel globe-world" role="region" aria-label="Die Welt">
            <WorldCard world={world} here={here} />
            {world.surface && <SurfaceSection lines={world.surface} />}
            <WorldActions world={world} here={here} travel={travel} onGlobe />
            {world.canNote && <NoteSection note={world.note} />}
            {world.happened.length > 0 && <HappenedList title="Was hier geschah" indices={world.happened} log={log} logDays={logDays} />}
          </div>
        )}
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
            <label className="globe-check globe-trace">
              <input type="checkbox" checked={globe.trace} onChange={() => game.toggleTrace()} /> Wo ich war: Reisen zeigen
            </label>
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

      <div className="globe-zoom" hidden={panel === 'world'}>
        {globe.partyCell !== undefined && (
          <button type="button" className="globe-round globe-locate" aria-label="Zur Gruppe" title="Zur Gruppe" onClick={flyToParty}>
            <LocateIcon />
          </button>
        )}
        <div className="globe-zoom-buttons">
          <button type="button" className="globe-round" aria-label="Hineinzoomen" onClick={() => glideZoom(1.6)}>
            +
          </button>
          <button type="button" className="globe-round" aria-label="Herauszoomen" title={camera.zoom <= 1 ? 'Zum Subsektor' : 'Herauszoomen'} onClick={() => (camera.zoom <= 1 ? leave() : glideZoom(1 / 1.6))}>
            −
          </button>
        </div>
      </div>

    </div>
  );
}

/**
 * Das angetippte Feld des Globus mit allem, was dort ist, und dem, was dort geschah. Es steht im
 * Ziehblatt bzw. im Panel neben dem Log an der Stelle des Bereichs; ✕ lässt das Feld los. Was man am
 * Feld tun kann (hinreisen, Gruppe setzen, NSC platzieren), steht darunter in der Reihe `FieldDock`.
 * Der Name beim Umbenennen ist reine Darstellung.
 */
export function FieldCard({
  globe,
  error,
  log,
  logDays,
  tripPlan,
}: {
  globe: GlobeView;
  error: string | undefined;
  log: readonly LogItem[];
  logDays: readonly (string | undefined)[];
  tripPlan: TripPlanView | undefined;
}) {
  const game = useGame();
  const [renaming, setRenaming] = useState<number | undefined>(undefined);
  const [newName, setNewName] = useState('');
  const picked = globe.picked;
  if (!picked) return null;
  return (
    <section className="field-card scroll" aria-label="Angetipptes Feld">
      <div className="globe-sheet-head" data-tray-peek>
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
        {globe.vehicles.some((v) => v.cell === picked.cell) && <li>Eigene Fahrzeuge stehen hier</li>}
        {picked.npcs.map((n) => (
          <li key={n.id}>
            <button type="button" className="link-button" aria-label={`NSC ${n.name} (${roleText[n.role]}) öffnen`} onClick={() => game.editCharacter(n.id)}>
              {n.name}
            </button>{' '}
            · NSC, {roleText[n.role]}
          </li>
        ))}
      </ul>
      {tripPlan && <TripPlanCard plan={tripPlan} />}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {picked.happened.length > 0 ? <HappenedList title="Was hier geschah" indices={picked.happened} log={log} logDays={logDays} /> : <p className="combat-hint">Hier ist noch nichts geschehen.</p>}
    </section>
  );
}

/**
 * Zeichen auf dem Globus: Kleinstädte außerhalb des besiedelten Gebiets, Städte, Vulkane, Ereignisse, NSC, die Gruppe, das angetippte
 * Feld als Ring (nur ohne WebGL). Flüsse und Straßen zeichnet die Grafikkarte (globe-gl.ts), ohne WebGL stehen sie in der Textur.
 */
function drawMarkers(ctx: CanvasRenderingContext2D, globe: GlobeView, camera: Camera, view: Viewport, scale: number, ring: boolean): void {
  const at = (cell: number) => screenOf(globe, camera, view, cell);
  // Kleinstädte außerhalb des besiedelten Gebiets: ein kleines helles Haus, sobald man etwas
  // hineinzoomt. Im besiedelten Gebiet zeigt schon die Farbe, dass dort Menschen leben.
  if (camera.zoom >= 2.2) {
    const s = (camera.zoom >= 3 ? 3.2 : 2.4) * scale;
    for (const [cell] of globe.map.towns ?? []) {
      if (landformAt(globe.map, cell) === 'settled' || globe.cities.some((c) => c.cell === cell)) continue;
      const p = at(cell);
      if (!p) continue;
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y + s);
      ctx.lineTo(p.x - s, p.y - s * 0.2);
      ctx.lineTo(p.x, p.y - s * 1.3);
      ctx.lineTo(p.x + s, p.y - s * 0.2);
      ctx.lineTo(p.x + s, p.y + s);
      ctx.closePath();
      ctx.fillStyle = 'rgba(232,226,210,0.95)';
      ctx.strokeStyle = 'rgba(20,20,20,0.8)';
      ctx.lineWidth = scale;
      ctx.fill();
      ctx.stroke();
    }
  }
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
  // Die Route: am Boden eine durchgezogene Linie von Feld zu Feld, ein Flug gestrichelt und gerade.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const leg of globe.route) {
    ctx.setLineDash(leg.flight ? [6 * scale, 5 * scale] : []);
    ctx.strokeStyle = leg.flight ? 'rgba(255,255,255,0.95)' : 'rgba(110,200,255,0.95)';
    ctx.lineWidth = 2.5 * scale;
    const steps = leg.flight ? flightPath(globe, camera, view, leg.cells[0]!, leg.cells.at(-1)!) : leg.cells.map((c) => at(c));
    ctx.beginPath();
    let drawing = false;
    for (const p of steps) {
      if (!p) {
        drawing = false;
        continue;
      }
      if (drawing) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
      drawing = true;
    }
    ctx.stroke();
  }
  // Wo ich war: die gereisten Strecken, orange und gepunktet, je als Großkreis von Tag zu Tag.
  ctx.setLineDash([2 * scale, 4 * scale]);
  ctx.strokeStyle = 'rgba(255,170,60,0.95)';
  ctx.lineWidth = 2.5 * scale;
  for (const [a, b] of globe.traceSegments) {
    ctx.beginPath();
    let drawing = false;
    for (const p of flightPath(globe, camera, view, a, b)) {
      if (!p) {
        drawing = false;
        continue;
      }
      if (drawing) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
      drawing = true;
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const v of globe.vehicles) badge(v.cell, 8, 8, 'rgba(170,230,140,0.95)', v.count > 1 ? String(v.count) : 'F');
  for (const e of globe.events) badge(e.cell, 8, -8, 'rgba(255,170,60,0.95)', e.count > 9 ? '9+' : String(e.count));
  const npcCells = new Map<number, number>();
  for (const n of globe.npcs) if (n.cell !== undefined) npcCells.set(n.cell, (npcCells.get(n.cell) ?? 0) + 1);
  for (const [cell, count] of npcCells) badge(cell, -8, -8, 'rgba(190,150,255,0.95)', count > 1 ? String(count) : 'N');
  if (globe.partyCell !== undefined) badge(globe.partyCell, 0, 10, 'rgba(110,200,255,1)', 'G');
  // Ohne WebGL ein Ring um das angetippte Feld; mit WebGL rahmt die Grafikkarte das Feld ein.
  const picked = globe.picked?.cell;
  if (ring && picked !== undefined) {
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

/** Ein Flug als Großkreis zwischen zwei Feldern, in Punkten auf dem Bildschirm; verdeckte Stücke fehlen. */
function flightPath(globe: GlobeView, camera: Camera, view: Viewport, a: number, b: number): readonly ({ x: number; y: number } | undefined)[] {
  const p = globe.grid.xyz;
  const [ax, ay, az, bx, by, bz] = [p[a * 3]!, p[a * 3 + 1]!, p[a * 3 + 2]!, p[b * 3]!, p[b * 3 + 1]!, p[b * 3 + 2]!];
  const angle = Math.acos(Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz)));
  const steps = Math.max(2, Math.ceil(angle / 0.03));
  const points: ({ x: number; y: number } | undefined)[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s = Math.sin(angle);
    const [u, v] = s < 1e-6 ? [1 - t, t] : [Math.sin((1 - t) * angle) / s, Math.sin(t * angle) / s];
    points.push(screenOfPoint(camera, view, u * ax + v * bx, u * ay + v * by, u * az + v * bz));
  }
  return points;
}
