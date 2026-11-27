import { useState } from "react";
import { DoorOpen, Fence, Mountain, Trees, Trash2, RotateCw } from "lucide-react";

export type MapObject = {
  id: string;
  kind: "wall" | "door" | "obstacle" | "decoration";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

const labels: Record<MapObject["kind"], string> = {
  wall: "Стена", door: "Дверь", obstacle: "Препятствие", decoration: "Декорация",
};

export default function RoomMapEditor({ objects, onChange, canEdit }: {
  objects: MapObject[];
  onChange: (objects: MapObject[]) => void;
  canEdit: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const add = (kind: MapObject["kind"]) => {
    const object: MapObject = {
      id: globalThis.crypto?.randomUUID?.() ?? `map-${Date.now()}`,
      kind, x: 50, y: 50, width: kind === "wall" ? 18 : 10,
      height: kind === "wall" ? 3 : kind === "door" ? 4 : 9, rotation: 0,
    };
    onChange([...objects, object]);
    setSelectedId(object.id);
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId || !canEdit) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, (event.clientX - rect.left) / rect.width * 100));
    const y = Math.max(2, Math.min(98, (event.clientY - rect.top) / rect.height * 100));
    onChange(objects.map(item => item.id === draggingId ? { ...item, x, y } : item));
  };

  const selected = objects.find(item => item.id === selectedId);
  const icons = { wall: Fence, door: DoorOpen, obstacle: Mountain, decoration: Trees };

  return <>
    <div className="map-object-toolbar" aria-label="Инструменты карты">
      <span>Объекты карты</span>
      <button type="button" disabled={!canEdit} onClick={() => add("wall")}><Fence size={14}/> Стена</button>
      <button type="button" disabled={!canEdit} onClick={() => add("door")}><DoorOpen size={14}/> Дверь</button>
      <button type="button" disabled={!canEdit} onClick={() => add("obstacle")}><Mountain size={14}/> Препятствие</button>
      <button type="button" disabled={!canEdit} onClick={() => add("decoration")}><Trees size={14}/> Декор</button>
      {selected && canEdit && <>
        <button type="button" title="Повернуть на 15°" onClick={() => onChange(objects.map(item => item.id === selected.id ? { ...item, rotation: (item.rotation + 15) % 360 } : item))}><RotateCw size={14}/></button>
        <button type="button" title="Удалить объект" onClick={() => { onChange(objects.filter(item => item.id !== selected.id)); setSelectedId(null); }}><Trash2 size={14}/></button>
      </>}
    </div>
    <div className="map-object-layer" onPointerMove={move} onPointerUp={() => setDraggingId(null)} onPointerLeave={() => setDraggingId(null)}>
      {objects.map(item => {
        const Icon = icons[item.kind];
        return <button type="button" key={item.id} className={`map-object map-object-${item.kind} ${selectedId === item.id ? "map-object-selected" : ""}`}
          style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%`, transform: `translate(-50%,-50%) rotate(${item.rotation}deg)` }}
          title={labels[item.kind]} aria-label={labels[item.kind]}
          onPointerDown={event => { setSelectedId(item.id); if (!canEdit) return; event.preventDefault(); setDraggingId(item.id); event.currentTarget.setPointerCapture(event.pointerId); }}
          onClick={() => setSelectedId(item.id)} disabled={!canEdit}>
          <Icon size={16}/>
        </button>;
      })}
    </div>
  </>;
}
