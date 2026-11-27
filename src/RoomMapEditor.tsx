import { useState } from "react";
import { DoorOpen, Fence, Mountain, Trees, Trash2, RotateCw, Eye, EyeOff, Layers, Lock, Unlock } from "lucide-react";

export type MapLayer = "terrain" | "structures" | "decorations";
export type LayerVisibility = Record<MapLayer, boolean>;
export const defaultLayerVisibility: LayerVisibility = { terrain: true, structures: true, decorations: true };
export type LayerLocks = Record<MapLayer, boolean>;
export const defaultLayerLocks: LayerLocks = { terrain: false, structures: false, decorations: false };

export type MapObject = {
  id: string;
  kind: "wall" | "door" | "obstacle" | "decoration";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layer?: MapLayer;
};

const labels: Record<MapObject["kind"], string> = {
  wall: "Стена", door: "Дверь", obstacle: "Препятствие", decoration: "Декорация",
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

  const layerOf = (item: MapObject): MapLayer => item.layer ?? (item.kind === "wall" || item.kind === "door" ? "structures" : item.kind === "obstacle" ? "terrain" : "decorations");
  const visibleObjects = objects.filter(item => visibleLayers[layerOf(item)]);
  const selected = objects.find(item => item.id === selectedId);
  const layerNames: Record<MapLayer, string> = { terrain: "Местность", structures: "Конструкции", decorations: "Декорации" };
  const icons = { wall: Fence, door: DoorOpen, obstacle: Mountain, decoration: Trees };
  const selectedLocked = selected ? layerLocks[layerOf(selected)] : false;

  const add = (kind: MapObject["kind"]) => {
    if (!canEdit || layerLocks[activeLayer]) return;
    const object: MapObject = {
      id: globalThis.crypto?.randomUUID?.() ?? `map-${Date.now()}`,
      kind, layer: activeLayer, x: 50, y: 50, width: kind === "wall" ? 18 : 10,
      height: kind === "wall" ? 3 : kind === "door" ? 4 : 9, rotation: 0,
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
    const draggedObject = objects.find(item => item.id === draggingId);
    if (!draggingId || !canEdit || !draggedObject || layerLocks[layerOf(draggedObject)]) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const cellSize = Math.max(12, Math.min(120, gridCellSizePx || 38));
    const x = Math.max(2, Math.min(98, (snapToGrid ? Math.round(rawX / cellSize) * cellSize : rawX) / rect.width * 100));
    const y = Math.max(2, Math.min(98, (snapToGrid ? Math.round(rawY / cellSize) * cellSize : rawY) / rect.height * 100));
    onChange(objects.map(item => item.id === draggingId ? { ...item, x, y } : item));
  };

  return <>
    <div className="map-object-toolbar" aria-label="Инструменты карты">
      <span><Layers size={13}/> Слои и объекты</span>
      <label className="map-layer-select">Активный слой
        <select value={activeLayer} onChange={event => setActiveLayer(event.target.value as MapLayer)} disabled={!canEdit}>
          <option value="terrain">Местность</option><option value="structures">Конструкции</option><option value="decorations">Декорации</option>
        </select>
      </label>
      <button type="button" disabled={!canEdit || layerLocks[activeLayer]} onClick={() => add("wall")}><Fence size={14}/> Стена</button>
      <button type="button" disabled={!canEdit || layerLocks[activeLayer]} onClick={() => add("door")}><DoorOpen size={14}/> Дверь</button>
      <button type="button" disabled={!canEdit || layerLocks[activeLayer]} onClick={() => add("obstacle")}><Mountain size={14}/> Препятствие</button>
      <button type="button" disabled={!canEdit || layerLocks[activeLayer]} onClick={() => add("decoration")}><Trees size={14}/> Декор</button>
      {selected && canEdit && visibleLayers[layerOf(selected)] && <>
        <button type="button" title="Повернуть на 15°" disabled={selectedLocked} onClick={() => updateSelected({ rotation: (selected.rotation + 15) % 360 })}><RotateCw size={14}/></button>
        <button type="button" title="Удалить объект" disabled={selectedLocked} onClick={() => { if (selectedLocked) return; onChange(objects.filter(item => item.id !== selected.id)); setSelectedId(null); }}><Trash2 size={14}/></button>
      </>}
      <div className="map-layer-visibility">{(["terrain", "structures", "decorations"] as MapLayer[]).map(layer => <div className="map-layer-control" key={layer}><button type="button" className={visibleLayers[layer] ? "layer-visible" : ""} disabled={!canEdit} title={`${visibleLayers[layer] ? "Скрыть" : "Показать"} слой: ${layerNames[layer]}`} aria-label={`${visibleLayers[layer] ? "Скрыть" : "Показать"} слой: ${layerNames[layer]}`} onClick={() => onVisibilityChange({ ...visibleLayers, [layer]: !visibleLayers[layer] })}>{visibleLayers[layer] ? <Eye size={13}/> : <EyeOff size={13}/>} {layerNames[layer]}</button><button type="button" className={layerLocks[layer] ? "layer-locked" : ""} disabled={!canEdit} title={`${layerLocks[layer] ? "Разблокировать" : "Заблокировать"} слой: ${layerNames[layer]}`} aria-label={`${layerLocks[layer] ? "Разблокировать" : "Заблокировать"} слой: ${layerNames[layer]}`} onClick={() => onLayerLocksChange({ ...layerLocks, [layer]: !layerLocks[layer] })}>{layerLocks[layer] ? <Lock size={13}/> : <Unlock size={13}/>}</button></div>)}</div>
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
    <div className="map-object-layer" onPointerMove={move} onPointerUp={() => { setDraggingId(null); onEditEnd(); }} onPointerLeave={() => { setDraggingId(null); onEditEnd(); }}>
      {visibleObjects.map(item => {
        const Icon = icons[item.kind];
        return <button type="button" key={item.id} className={`map-object map-object-${item.kind} ${selectedId === item.id ? "map-object-selected" : ""}`}
          style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%`, zIndex: layerOf(item) === "terrain" ? 1 : layerOf(item) === "structures" ? 2 : 3, transform: `translate(-50%,-50%) rotate(${item.rotation}deg)` }}
          title={labels[item.kind]} aria-label={labels[item.kind]}
          onPointerDown={event => { setSelectedId(item.id); if (!canEdit || layerLocks[layerOf(item)]) return; event.preventDefault(); onEditStart(); setDraggingId(item.id); event.currentTarget.setPointerCapture(event.pointerId); }}
          onClick={() => setSelectedId(item.id)} disabled={!canEdit}>
          <Icon size={16}/>
        </button>;
      })}
    </div>
  </>;
}
