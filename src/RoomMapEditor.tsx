import { useState } from "react";
import { DoorOpen, Fence, Mountain, Trees, Trash2, RotateCw, Eye, EyeOff, Layers } from "lucide-react";

export type MapLayer = "terrain" | "structures" | "decorations";
export type LayerVisibility = Record<MapLayer, boolean>;
export const defaultLayerVisibility: LayerVisibility = { terrain: true, structures: true, decorations: true };

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

export default function RoomMapEditor({ objects, onChange, canEdit, visibleLayers, onVisibilityChange, snapToGrid }: {
  objects: MapObject[];
  onChange: (objects: MapObject[]) => void;
  canEdit: boolean;
  visibleLayers: LayerVisibility;
  onVisibilityChange: (visibility: LayerVisibility) => void;
  snapToGrid: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>("structures");

  const layerOf = (item: MapObject): MapLayer => item.layer ?? (item.kind === "wall" || item.kind === "door" ? "structures" : item.kind === "obstacle" ? "terrain" : "decorations");
  const visibleObjects = objects.filter(item => visibleLayers[layerOf(item)]);
  const selected = objects.find(item => item.id === selectedId);
  const layerNames: Record<MapLayer, string> = { terrain: "Местность", structures: "Конструкции", decorations: "Декорации" };
  const icons = { wall: Fence, door: DoorOpen, obstacle: Mountain, decoration: Trees };

  const add = (kind: MapObject["kind"]) => {
    const object: MapObject = {
      id: globalThis.crypto?.randomUUID?.() ?? `map-${Date.now()}`,
      kind, layer: activeLayer, x: 50, y: 50, width: kind === "wall" ? 18 : 10,
      height: kind === "wall" ? 3 : kind === "door" ? 4 : 9, rotation: 0,
    };
    onChange([...objects, object]);
    setSelectedId(object.id);
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId || !canEdit) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const x = Math.max(2, Math.min(98, (snapToGrid ? Math.round(rawX / 38) * 38 : rawX) / rect.width * 100));
    const y = Math.max(2, Math.min(98, (snapToGrid ? Math.round(rawY / 38) * 38 : rawY) / rect.height * 100));
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
      <button type="button" disabled={!canEdit} onClick={() => add("wall")}><Fence size={14}/> Стена</button>
      <button type="button" disabled={!canEdit} onClick={() => add("door")}><DoorOpen size={14}/> Дверь</button>
      <button type="button" disabled={!canEdit} onClick={() => add("obstacle")}><Mountain size={14}/> Препятствие</button>
      <button type="button" disabled={!canEdit} onClick={() => add("decoration")}><Trees size={14}/> Декор</button>
      {selected && canEdit && visibleLayers[layerOf(selected)] && <>
        <button type="button" title="Повернуть на 15°" onClick={() => onChange(objects.map(item => item.id === selected.id ? { ...item, rotation: (item.rotation + 15) % 360 } : item))}><RotateCw size={14}/></button>
        <button type="button" title="Удалить объект" onClick={() => { onChange(objects.filter(item => item.id !== selected.id)); setSelectedId(null); }}><Trash2 size={14}/></button>
      </>}
      <div className="map-layer-visibility">{(["terrain", "structures", "decorations"] as MapLayer[]).map(layer => <button key={layer} type="button" className={visibleLayers[layer] ? "layer-visible" : ""} disabled={!canEdit} title={`${visibleLayers[layer] ? "Скрыть" : "Показать"} слой: ${layerNames[layer]}`} onClick={() => onVisibilityChange({ ...visibleLayers, [layer]: !visibleLayers[layer] })}>{visibleLayers[layer] ? <Eye size={13}/> : <EyeOff size={13}/>} {layerNames[layer]}</button>)}</div>
    </div>
    <div className="map-object-layer" onPointerMove={move} onPointerUp={() => setDraggingId(null)} onPointerLeave={() => setDraggingId(null)}>
      {visibleObjects.map(item => {
        const Icon = icons[item.kind];
        return <button type="button" key={item.id} className={`map-object map-object-${item.kind} ${selectedId === item.id ? "map-object-selected" : ""}`}
          style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%`, zIndex: layerOf(item) === "terrain" ? 1 : layerOf(item) === "structures" ? 2 : 3, transform: `translate(-50%,-50%) rotate(${item.rotation}deg)` }}
          title={labels[item.kind]} aria-label={labels[item.kind]}
          onPointerDown={event => { setSelectedId(item.id); if (!canEdit) return; event.preventDefault(); setDraggingId(item.id); event.currentTarget.setPointerCapture(event.pointerId); }}
          onClick={() => setSelectedId(item.id)} disabled={!canEdit}>
          <Icon size={16}/>
        </button>;
      })}
    </div>
  </>;
}
