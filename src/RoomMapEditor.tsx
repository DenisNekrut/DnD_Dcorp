import { useRef, useState } from "react";
import { DoorOpen, Fence, Mountain, Trees, Trash2, RotateCw, Eye, EyeOff, Layers, Lock, Unlock, MapPinned, House, Ruler, Circle } from "lucide-react";

export type MapLayer = "terrain" | "structures" | "decorations";
export type TableLayer = "background" | MapLayer | "figures";
export type LayerVisibility = Record<TableLayer, boolean>;
export const defaultLayerVisibility: LayerVisibility = { background: true, terrain: true, structures: true, decorations: true, figures: true };
export type LayerLocks = Record<TableLayer, boolean>;
export const defaultLayerLocks: LayerLocks = { background: false, terrain: false, structures: false, decorations: false, figures: false };

export type TerrainZoneType = "difficult" | "water" | "fire" | "fog" | "hazard";
type DrawingMode = "zone" | "wall" | "room" | null;
type Measurement = { x: number; y: number; width: number; angle: number; feet: number; cells: number };
export type MapObject = {
  id: string;
  kind: "wall" | "door" | "obstacle" | "decoration" | "zone" | "room";
  zoneType?: TerrainZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layer?: MapLayer;
};

const labels: Record<MapObject["kind"], string> = {
  wall: "Стена", door: "Дверь", obstacle: "Препятствие", decoration: "Декорация", zone: "Область местности", room: "Комната",
};

export default function RoomMapEditor({ objects, onChange, canEdit, visibleLayers, onVisibilityChange, layerLocks, onLayerLocksChange, onEditStart, onEditEnd, snapToGrid, gridCellSizePx }: {
  objects: MapObject[];
  onChange: (objects: MapObject[]) => void;
  canEdit: boolean;
  visibleLayers: LayerVisibility;
  onVisibilityChange: (visibility: LayerVisibility) => void;
  layerLocks: LayerLocks;
  onLayerLocksChange: (locks: LayerLocks) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  snapToGrid: boolean;
  gridCellSizePx: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>("structures");
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
  const [zoneType, setZoneType] = useState<TerrainZoneType>("difficult");
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const drawingStartRef = useRef<{ x: number; y: number } | null>(null);
  const [measurementMode, setMeasurementMode] = useState<"distance" | "radius" | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [radiusFeet, setRadiusFeet] = useState(15);
  const [radiusPreview, setRadiusPreview] = useState<{ x: number; y: number; width: number; height: number; feet: number } | null>(null);
  const measurementStartRef = useRef<{ x: number; y: number } | null>(null);

  const layerOf = (item: MapObject): MapLayer => item.layer ?? (item.kind === "wall" || item.kind === "door" || item.kind === "room" ? "structures" : item.kind === "obstacle" || item.kind === "zone" ? "terrain" : "decorations");
  const visibleObjects = objects.filter(item => visibleLayers[layerOf(item)]);
  const selected = objects.find(item => item.id === selectedId);
  const layerNames: Record<TableLayer, string> = { background: "Подложка", terrain: "Местность", structures: "Конструкции", decorations: "Декорации", figures: "Фигуры" };
  const icons = { wall: Fence, door: DoorOpen, obstacle: Mountain, decoration: Trees, zone: MapPinned, room: House };
  const selectedLocked = selected ? layerLocks[layerOf(selected)] : false;

  const add = (kind: MapObject["kind"]) => {
    if (!canEdit || layerLocks[activeLayer]) return;
    const object: MapObject = {
      id: globalThis.crypto?.randomUUID?.() ?? `map-${Date.now()}`,
      kind, layer: activeLayer, ...(kind === "zone" ? { zoneType } : {}), x: 50, y: 50, width: kind === "wall" ? 18 : kind === "zone" ? 20 : kind === "room" ? 22 : 10,
      height: kind === "wall" ? 3 : kind === "door" ? 4 : kind === "zone" ? 16 : kind === "room" ? 18 : 9, rotation: 0,
    };
    onChange([...objects, object]);
    setSelectedId(object.id);
  };

  const updateSelected = (patch: Partial<MapObject>) => {
    if (!selected || !canEdit || layerLocks[layerOf(selected)]) return;
    onChange(objects.map(item => item.id === selected.id ? { ...item, ...patch } : item));
  };

  const reorderSelected = (direction: -1 | 1) => {
    if (!selected || !canEdit || layerLocks[layerOf(selected)]) return;
    const index = objects.findIndex(item => item.id === selected.id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= objects.length || layerLocks[layerOf(objects[next])]) return;
    const reordered = [...objects];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    onChange(reordered);
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (measurementMode === "distance" && isMeasuring && measurementStartRef.current) {
      const cellSize = Math.max(12, Math.min(120, gridCellSizePx || 38));
      const rawEndX = event.clientX - rect.left;
      const rawEndY = event.clientY - rect.top;
      const endX = Math.max(0, Math.min(100, (snapToGrid ? Math.round(rawEndX / cellSize) * cellSize : rawEndX) / rect.width * 100));
      const endY = Math.max(0, Math.min(100, (snapToGrid ? Math.round(rawEndY / cellSize) * cellSize : rawEndY) / rect.height * 100));
      const start = measurementStartRef.current;
      const dx = (endX - start.x) * rect.width / 100;
      const dy = (endY - start.y) * rect.height / 100;
      const cells = Math.max(Math.abs(dx), Math.abs(dy)) / cellSize;
      setMeasurement({
        x: start.x,
        y: start.y,
        width: Math.hypot(dx, dy) / rect.width * 100,
        angle: Math.atan2(dy, dx) * 180 / Math.PI,
        cells,
        feet: Math.round(cells * 5),
      });
      return;
    }
    if (drawingId && drawingStartRef.current && drawingMode && canEdit) {
      const expectedLayer = drawingMode === "zone" ? "terrain" : "structures";
      if (layerLocks[expectedLayer]) return;
      const cellSize = Math.max(12, Math.min(120, gridCellSizePx || 38));
      const rawEndX = event.clientX - rect.left;
      const rawEndY = event.clientY - rect.top;
      const endX = Math.max(0, Math.min(100, (snapToGrid ? Math.round(rawEndX / cellSize) * cellSize : rawEndX) / rect.width * 100));
      const endY = Math.max(0, Math.min(100, (snapToGrid ? Math.round(rawEndY / cellSize) * cellSize : rawEndY) / rect.height * 100));
      const start = drawingStartRef.current;
      const dx = (endX - start.x) * rect.width / 100;
      const dy = (endY - start.y) * rect.height / 100;
      const isWall = drawingMode === "wall";
      const width = isWall ? Math.max(2, Math.hypot(dx, dy) / rect.width * 100) : Math.max(2, Math.abs(endX - start.x));
      const height = isWall ? Math.max(1.2, 4 / rect.height * 100) : Math.max(2, Math.abs(endY - start.y));
      const rotation = isWall ? Math.atan2(dy, dx) * 180 / Math.PI : 0;
      onChange(objects.map(item => item.id === drawingId ? {
        ...item,
        x: (start.x + endX) / 2,
        y: (start.y + endY) / 2,
        width,
        height,
        rotation,
      } : item));
      return;
    }
    const draggedObject = objects.find(item => item.id === draggingId);
    if (!draggingId || !canEdit || !draggedObject || layerLocks[layerOf(draggedObject)]) return;
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const cellSize = Math.max(12, Math.min(120, gridCellSizePx || 38));
    const x = Math.max(2, Math.min(98, (snapToGrid ? Math.round(rawX / cellSize) * cellSize : rawX) / rect.width * 100));
    const y = Math.max(2, Math.min(98, (snapToGrid ? Math.round(rawY / cellSize) * cellSize : rawY) / rect.height * 100));
    onChange(objects.map(item => item.id === draggingId ? { ...item, x, y } : item));
  };

  const beginDrawObject = (event: React.PointerEvent<HTMLDivElement>) => {
    const expectedLayer = drawingMode === "zone" ? "terrain" : "structures";
    if (!drawingMode || !canEdit || activeLayer !== expectedLayer || layerLocks[expectedLayer] || !visibleLayers[expectedLayer] || event.target !== event.currentTarget) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const cellSize = Math.max(12, Math.min(120, gridCellSizePx || 38));
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const x = Math.max(0, Math.min(100, (snapToGrid ? Math.round(rawX / cellSize) * cellSize : rawX) / rect.width * 100));
    const y = Math.max(0, Math.min(100, (snapToGrid ? Math.round(rawY / cellSize) * cellSize : rawY) / rect.height * 100));
    const kind: MapObject["kind"] = drawingMode === "zone" ? "zone" : drawingMode === "wall" ? "wall" : "room";
    const object: MapObject = {
      id: globalThis.crypto?.randomUUID?.() ?? `draw-${Date.now()}`,
      kind, layer: expectedLayer, ...(kind === "zone" ? { zoneType } : {}),
      x, y, width: 2, height: kind === "wall" ? 1.2 : 2, rotation: 0,
    };
    onEditStart();
    drawingStartRef.current = { x, y };
    setDrawingId(object.id);
    setSelectedId(object.id);
    onChange([...objects, object]);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const beginMeasure = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!measurementMode || event.target !== event.currentTarget) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const cellSize = Math.max(12, Math.min(120, gridCellSizePx || 38));
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const x = Math.max(0, Math.min(100, (snapToGrid ? Math.round(rawX / cellSize) * cellSize : rawX) / rect.width * 100));
    const y = Math.max(0, Math.min(100, (snapToGrid ? Math.round(rawY / cellSize) * cellSize : rawY) / rect.height * 100));
    if (measurementMode === "radius") {
      const radiusPx = radiusFeet / 5 * cellSize;
      setRadiusPreview({ x, y, width: radiusPx * 2 / rect.width * 100, height: radiusPx * 2 / rect.height * 100, feet: radiusFeet });
      return;
    }
    measurementStartRef.current = { x, y };
    setMeasurement({ x, y, width: 0, angle: 0, feet: 0, cells: 0 });
    setIsMeasuring(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const setMeasureTool = (mode: "distance" | "radius" | null) => {
    setMeasurementMode(mode);
    setDrawingMode(null);
    setMeasurement(null);
    setRadiusPreview(null);
    setIsMeasuring(false);
    measurementStartRef.current = null;
  };

  const finishPointer = () => {
    setDraggingId(null);
    setDrawingId(null);
    drawingStartRef.current = null;
    setIsMeasuring(false);
    measurementStartRef.current = null;
    onEditEnd();
  };

  return <>
    <div className="map-object-toolbar" aria-label="Инструменты карты">
      <span><Layers size={13}/> Слои и объекты</span>
      <label className="map-layer-select">Активный слой
        <select value={activeLayer} onChange={event => { const next = event.target.value as MapLayer; setActiveLayer(next); setDrawingMode(null); }} disabled={!canEdit}>
          <option value="terrain">Местность</option><option value="structures">Конструкции</option><option value="decorations">Декорации</option>
        </select>
      </label>
      <button type="button" disabled={!canEdit || layerLocks[activeLayer]} onClick={() => add("wall")}><Fence size={14}/> Стена</button>
      <button type="button" disabled={!canEdit || layerLocks[activeLayer]} onClick={() => add("door")}><DoorOpen size={14}/> Дверь</button>
      <button type="button" disabled={!canEdit || layerLocks[activeLayer]} onClick={() => add("obstacle")}><Mountain size={14}/> Препятствие</button>
      <button type="button" disabled={!canEdit || layerLocks[activeLayer]} onClick={() => add("decoration")}><Trees size={14}/> Декор</button>
      {activeLayer === "terrain" && <label className="terrain-zone-select">Тип области
        <select value={zoneType} onChange={event => setZoneType(event.target.value as TerrainZoneType)} disabled={!canEdit || layerLocks.terrain}>
          <option value="difficult">Трудная местность</option><option value="water">Вода</option><option value="fire">Огонь</option><option value="fog">Туман</option><option value="hazard">Опасная зона</option>
        </select>
      </label>}
      {activeLayer === "terrain" && <button type="button" className={drawingMode === "zone" ? "tool-active" : ""} disabled={!canEdit || layerLocks.terrain || !visibleLayers.terrain} onClick={() => { setMeasureTool(null); setDrawingMode(value => value === "zone" ? null : "zone"); }}><MapPinned size={14}/> {drawingMode === "zone" ? "Стоп: область" : "Рисовать область"}</button>}
      {activeLayer === "structures" && <>
        <button type="button" className={drawingMode === "wall" ? "tool-active" : ""} disabled={!canEdit || layerLocks.structures || !visibleLayers.structures} onClick={() => { setMeasureTool(null); setDrawingMode(value => value === "wall" ? null : "wall"); }}><Fence size={14}/> {drawingMode === "wall" ? "Стоп: стена" : "Рисовать стену"}</button>
        <button type="button" className={drawingMode === "room" ? "tool-active" : ""} disabled={!canEdit || layerLocks.structures || !visibleLayers.structures} onClick={() => { setMeasureTool(null); setDrawingMode(value => value === "room" ? null : "room"); }}><House size={14}/> {drawingMode === "room" ? "Стоп: комната" : "Создать комнату"}</button>
      </>}
      <button type="button" className={measurementMode === "distance" ? "tool-active" : ""} title="Измерить расстояние по сетке: 1 клетка = 5 футов; диагональ считается за 5 футов" onClick={() => setMeasureTool(measurementMode === "distance" ? null : "distance")}><Ruler size={14}/> Линейка</button>
      <label className="radius-size-select">Радиус
        <select value={radiusFeet} onChange={event => { setRadiusFeet(Number(event.target.value)); setRadiusPreview(null); }} aria-label="Радиус области в футах">
          {[5, 10, 15, 20, 30, 40, 60].map(value => <option key={value} value={value}>{value} ft</option>)}
        </select>
      </label>
      <button type="button" className={measurementMode === "radius" ? "tool-active" : ""} title="Показать круг заданного радиуса на карте" onClick={() => setMeasureTool(measurementMode === "radius" ? null : "radius")}><Circle size={14}/> Область</button>
      {selected && canEdit && visibleLayers[layerOf(selected)] && <>
        <button type="button" title="Повернуть на 15°" disabled={selectedLocked} onClick={() => updateSelected({ rotation: (selected.rotation + 15) % 360 })}><RotateCw size={14}/></button>
        <button type="button" title="Удалить объект" disabled={selectedLocked} onClick={() => { if (selectedLocked) return; onChange(objects.filter(item => item.id !== selected.id)); setSelectedId(null); }}><Trash2 size={14}/></button>
      </>}
      <div className="map-layer-visibility">{(["background", "terrain", "structures", "decorations", "figures"] as TableLayer[]).map(layer => <div className="map-layer-control" key={layer}><button type="button" className={visibleLayers[layer] ? "layer-visible" : ""} disabled={!canEdit} title={`${visibleLayers[layer] ? "Скрыть" : "Показать"} слой: ${layerNames[layer]}`} aria-label={`${visibleLayers[layer] ? "Скрыть" : "Показать"} слой: ${layerNames[layer]}`} onClick={() => onVisibilityChange({ ...visibleLayers, [layer]: !visibleLayers[layer] })}>{visibleLayers[layer] ? <Eye size={13}/> : <EyeOff size={13}/>} {layerNames[layer]}</button><button type="button" className={layerLocks[layer] ? "layer-locked" : ""} disabled={!canEdit} title={`${layerLocks[layer] ? "Разблокировать" : "Заблокировать"} слой: ${layerNames[layer]}`} aria-label={`${layerLocks[layer] ? "Разблокировать" : "Заблокировать"} слой: ${layerNames[layer]}`} onClick={() => onLayerLocksChange({ ...layerLocks, [layer]: !layerLocks[layer] })}>{layerLocks[layer] ? <Lock size={13}/> : <Unlock size={13}/>}</button></div>)}</div>
    </div>
    {selected && canEdit && visibleLayers[layerOf(selected)] && <div className={`map-object-inspector ${selectedLocked ? "inspector-locked" : ""}`} onPointerDown={event => event.stopPropagation()}>
      <strong>Параметры объекта {selectedLocked && <span className="locked-hint"><Lock size={12}/> Слой заблокирован</span>}</strong>
      <label>X <input disabled={selectedLocked} type="number" min="2" max="98" step="0.5" value={selected.x} onChange={event => updateSelected({ x: Math.max(2, Math.min(98, Number(event.target.value))) })}/></label>
      <label>Y <input disabled={selectedLocked} type="number" min="2" max="98" step="0.5" value={selected.y} onChange={event => updateSelected({ y: Math.max(2, Math.min(98, Number(event.target.value))) })}/></label>
      <label>Ш <input disabled={selectedLocked} type="number" min="2" max="80" step="0.5" value={selected.width} onChange={event => updateSelected({ width: Math.max(2, Math.min(80, Number(event.target.value))) })}/></label>
      <label>В <input disabled={selectedLocked} type="number" min="2" max="80" step="0.5" value={selected.height} onChange={event => updateSelected({ height: Math.max(2, Math.min(80, Number(event.target.value))) })}/></label>
      <label>° <input disabled={selectedLocked} type="number" min="0" max="359" step="15" value={selected.rotation} onChange={event => updateSelected({ rotation: ((Number(event.target.value) % 360) + 360) % 360 })}/></label>
      <button type="button" title="На один уровень вперёд" disabled={selectedLocked} onClick={() => reorderSelected(1)}>Вперёд</button>
      <button type="button" title="На один уровень назад" disabled={selectedLocked} onClick={() => reorderSelected(-1)}>Назад</button>
    </div>}
    <div className={`map-object-layer ${drawingMode ? "drawing-object-mode" : ""} ${measurementMode ? "measuring-mode" : ""}`} onPointerDown={event => measurementMode ? beginMeasure(event) : beginDrawObject(event)} onPointerMove={move} onPointerUp={finishPointer} onPointerLeave={finishPointer}>
      {visibleObjects.map(item => {
        const Icon = icons[item.kind];
        return <button type="button" key={item.id} className={`map-object map-object-${item.kind} ${item.kind === "zone" ? `map-zone-${item.zoneType ?? "difficult"}` : ""} ${item.kind === "room" ? "map-object-room" : ""} ${selectedId === item.id ? "map-object-selected" : ""}`}
          style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%`, zIndex: layerOf(item) === "terrain" ? 1 : layerOf(item) === "structures" ? 2 : 3, transform: `translate(-50%,-50%) rotate(${item.rotation}deg)` }}
          title={labels[item.kind]} aria-label={labels[item.kind]}
          onPointerDown={event => { setSelectedId(item.id); if (measurementMode || !canEdit || layerLocks[layerOf(item)]) return; event.preventDefault(); event.stopPropagation(); onEditStart(); setDraggingId(item.id); event.currentTarget.setPointerCapture(event.pointerId); }}
          onClick={() => setSelectedId(item.id)} disabled={!canEdit}>
          {item.kind === "zone" ? <span className="map-zone-label">{item.zoneType === "water" ? "Вода" : item.zoneType === "fire" ? "Огонь" : item.zoneType === "fog" ? "Туман" : item.zoneType === "hazard" ? "Опасность" : "Трудная местность"}</span> : item.kind === "room" ? <span className="map-room-label">Комната</span> : <Icon size={16}/>} 
        </button>;
      })}
      {radiusPreview && <div className="map-radius-preview" style={{ left: `${radiusPreview.x}%`, top: `${radiusPreview.y}%`, width: `${radiusPreview.width}%`, height: `${radiusPreview.height}%` }}><span>Радиус {radiusPreview.feet} фут.</span></div>}
      {measurement && <div className="map-ruler-line" style={{ left: `${measurement.x}%`, top: `${measurement.y}%`, width: `${measurement.width}%`, transform: `rotate(${measurement.angle}deg)` }}>
        <span>{measurement.feet} ft · {Number(measurement.cells.toFixed(1))} клетки</span>
      </div>}
    </div>
  </>;
}
