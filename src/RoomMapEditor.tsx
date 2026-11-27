import { useRef, useState } from "react";
import { DoorOpen, Fence, Mountain, Trees, Trash2, RotateCw, Eye, EyeOff, Layers, Lock, Unlock, MapPinned } from "lucide-react";

export type MapLayer = "terrain" | "structures" | "decorations";
export type TableLayer = "background" | MapLayer | "figures";
export type LayerVisibility = Record<TableLayer, boolean>;
export const defaultLayerVisibility: LayerVisibility = { background: true, terrain: true, structures: true, decorations: true, figures: true };
export type LayerLocks = Record<TableLayer, boolean>;
export const defaultLayerLocks: LayerLocks = { background: false, terrain: false, structures: false, decorations: false, figures: false };

export type TerrainZoneType = "difficult" | "water" | "fire" | "fog" | "hazard";
export type MapObject = {
  id: string;
  kind: "wall" | "door" | "obstacle" | "decoration" | "zone";
  zoneType?: TerrainZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layer?: MapLayer;
};

const labels: Record<MapObject["kind"], string> = {
  wall: "Стена", door: "Дверь", obstacle: "Препятствие", decoration: "Декорация", zone: "Область местности",
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
  const [drawingMode, setDrawingMode] = useState(false);
  const [zoneType, setZoneType] = useState<TerrainZoneType>("difficult");
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const drawingStartRef = useRef<{ x: number; y: number } | null>(null);

  const layerOf = (item: MapObject): MapLayer => item.layer ?? (item.kind === "wall" || item.kind === "door" ? "structures" : item.kind === "obstacle" || item.kind === "zone" ? "terrain" : "decorations");
  const visibleObjects = objects.filter(item => visibleLayers[layerOf(item)]);
  const selected = objects.find(item => item.id === selectedId);
  const layerNames: Record<TableLayer, string> = { background: "Подложка", terrain: "Местность", structures: "Конструкции", decorations: "Декорации", figures: "Фигуры" };
  const icons = { wall: Fence, door: DoorOpen, obstacle: Mountain, decoration: Trees, zone: MapPinned };
  const selectedLocked = selected ? layerLocks[layerOf(selected)] : false;

  const add = (kind: MapObject["kind"]) => {
    if (!canEdit || layerLocks[activeLayer]) return;
    const object: MapObject = {
      id: globalThis.crypto?.randomUUID?.() ?? `map-${Date.now()}`,
      kind, layer: activeLayer, ...(kind === "zone" ? { zoneType } : {}), x: 50, y: 50, width: kind === "wall" ? 18 : kind === "zone" ? 20 : 10,
      height: kind === "wall" ? 3 : kind === "door" ? 4 : kind === "zone" ? 16 : 9, rotation: 0,
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
    if (drawingId && drawingStartRef.current && canEdit && !layerLocks.terrain) {
      const endX = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
      const endY = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
      const start = drawingStartRef.current;
      const width = Math.max(2, Math.abs(endX - start.x));
      const height = Math.max(2, Math.abs(endY - start.y));
      onChange(objects.map(item => item.id === drawingId ? {
        ...item,
        x: (start.x + endX) / 2,
        y: (start.y + endY) / 2,
        width,
        height,
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

  const beginDrawZone = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingMode || !canEdit || activeLayer !== "terrain" || layerLocks.terrain || !visibleLayers.terrain || event.target !== event.currentTarget) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
    const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
    const object: MapObject = {
      id: globalThis.crypto?.randomUUID?.() ?? `zone-${Date.now()}`,
      kind: "zone", layer: "terrain", zoneType, x, y, width: 2, height: 2, rotation: 0,
    };
    onEditStart();
    drawingStartRef.current = { x, y };
    setDrawingId(object.id);
    setSelectedId(object.id);
    onChange([...objects, object]);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const finishPointer = () => {
    setDraggingId(null);
    setDrawingId(null);
    drawingStartRef.current = null;
    onEditEnd();
  };

  return <>
    <div className="map-object-toolbar" aria-label="Инструменты карты">
      <span><Layers size={13}/> Слои и объекты</span>
      <label className="map-layer-select">Активный слой
        <select value={activeLayer} onChange={event => { const next = event.target.value as MapLayer; setActiveLayer(next); if (next !== "terrain") setDrawingMode(false); }} disabled={!canEdit}>
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
      <button type="button" className={drawingMode ? "tool-active" : ""} disabled={!canEdit || activeLayer !== "terrain" || layerLocks.terrain || !visibleLayers.terrain} onClick={() => setDrawingMode(value => !value)}><MapPinned size={14}/> {drawingMode ? "Завершить рисование" : "Рисовать область"}</button>
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
    <div className={`map-object-layer ${drawingMode ? "drawing-zone-mode" : ""}`} onPointerDown={beginDrawZone} onPointerMove={move} onPointerUp={finishPointer} onPointerLeave={finishPointer}>
      {visibleObjects.map(item => {
        const Icon = icons[item.kind];
        return <button type="button" key={item.id} className={`map-object map-object-${item.kind} ${item.kind === "zone" ? `map-zone-${item.zoneType ?? "difficult"}` : ""} ${selectedId === item.id ? "map-object-selected" : ""}`}
          style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%`, zIndex: layerOf(item) === "terrain" ? 1 : layerOf(item) === "structures" ? 2 : 3, transform: `translate(-50%,-50%) rotate(${item.rotation}deg)` }}
          title={labels[item.kind]} aria-label={labels[item.kind]}
          onPointerDown={event => { setSelectedId(item.id); if (!canEdit || layerLocks[layerOf(item)]) return; event.preventDefault(); event.stopPropagation(); onEditStart(); setDraggingId(item.id); event.currentTarget.setPointerCapture(event.pointerId); }}
          onClick={() => setSelectedId(item.id)} disabled={!canEdit}>
          {item.kind === "zone" ? <span className="map-zone-label">{item.zoneType === "water" ? "Вода" : item.zoneType === "fire" ? "Огонь" : item.zoneType === "fog" ? "Туман" : item.zoneType === "hazard" ? "Опасность" : "Трудная местность"}</span> : <Icon size={16}/>} 
        </button>;
      })}
    </div>
  </>;
}
