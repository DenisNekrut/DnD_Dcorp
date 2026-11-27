import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Dice5, Eye, Grid3X3, Minus, Plus, Send, Shield, Swords, Users, ZoomIn, ZoomOut, Settings2, Map, UserPlus, Magnet, Undo2, Redo2, ImagePlus, Trash2 } from "lucide-react";
import { apiRequest, isApiConfigured } from "./api";
import RoomMapEditor, { type MapObject, type LayerVisibility, type LayerLocks, defaultLayerVisibility, defaultLayerLocks } from "./RoomMapEditor";
import "./styles/tabletop.css";
import "./styles/tabletop-room.css";
import "./styles/tabletop-map-editor.css";
import "./styles/tabletop-publication.css";
import "./styles/tabletop-layers.css";

type Token = { id: string; name: string; kind: "hero" | "enemy" | "ally"; x: number; y: number; hp: number; maxHp: number; color: string; initiative: number };
type LogEntry = { id: number; text: string; tone: "gold" | "muted" | "danger" };
type RoomSettings = { configured: boolean; published: boolean; name: string; description: string; mapTheme: "sand" | "stone" | "forest"; grid: boolean; snapToGrid: boolean; gridCellSizePx?: number };
type MapAsset = { key: string; url: string; contentType: string; size: number };
type MapView = { scale: number; x: number; y: number };
type TableState = { room: RoomSettings; tokens: Token[]; objects?: MapObject[]; layerVisibility?: LayerVisibility; layerLocks?: LayerLocks; mapAsset?: MapAsset | null; mapView?: MapView; round: number; log: LogEntry[] };
type CampaignCharacter = { id: string; name: string; data: Record<string, unknown> };
type TableResponse = { state: Partial<TableState>; updatedAt: string | null; permissions?: { canEdit: boolean } };
type EditorSnapshot = { tokens: Token[]; objects: MapObject[]; layerVisibility: LayerVisibility; layerLocks: LayerLocks; mapView: MapView };
type EditorHistory = { past: EditorSnapshot[]; future: EditorSnapshot[] };
const cloneEditorSnapshot = (snapshot: EditorSnapshot): EditorSnapshot => JSON.parse(JSON.stringify(snapshot)) as EditorSnapshot;
const defaultMapView: MapView = { scale: 1, x: 0, y: 0 };

const emptyRoom: RoomSettings = { configured: false, published: false, name: "", description: "", mapTheme: "sand", grid: true, snapToGrid: true, gridCellSizePx: 38 };
const localKey = (id: string) => `dnd-dcorp-table-${id}`;
const newId = () => globalThis.crypto?.randomUUID?.() ?? `token-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

export default function GameTable({ campaignName, campaignId, isGuest, onBack }: { campaignName: string; campaignId?: string; isGuest: boolean; onBack: () => void }) {
  const remoteEnabled = Boolean(campaignId && !isGuest && isApiConfigured());
  const [room, setRoom] = useState<RoomSettings>({ ...emptyRoom });
  const [tokens, setTokens] = useState<Token[]>([]);
  const [objects, setObjects] = useState<MapObject[]>([]);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({ ...defaultLayerVisibility });
  const [layerLocks, setLayerLocks] = useState<LayerLocks>({ ...defaultLayerLocks });
  const [mapAsset, setMapAsset] = useState<MapAsset | null>(null);
  const [mapView, setMapView] = useState<MapView>({ ...defaultMapView });
  const [mapUploading, setMapUploading] = useState(false);
  const mapFileInputRef = useRef<HTMLInputElement>(null);
  const [editorHistory, setEditorHistory] = useState<EditorHistory>({ past: [], future: [] });
  const historyGroupRef = useRef(false);
  const historyGroupStartRef = useRef<EditorSnapshot | null>(null);
  const [campaignCharacters, setCampaignCharacters] = useState<CampaignCharacter[]>([]);
  const [rosterError, setRosterError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [canEdit, setCanEdit] = useState(!remoteEnabled);
  const [tableLoaded, setTableLoaded] = useState(!remoteEnabled);
  const [tableError, setTableError] = useState("");
  const [diceBusy, setDiceBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [roomName, setRoomName] = useState(campaignName);
  const [roomDescription, setRoomDescription] = useState("");
  const [mapTheme, setMapTheme] = useState<RoomSettings["mapTheme"]>("sand");
  const [grid, setGrid] = useState(true);
  const [editingRoom, setEditingRoom] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenKind, setNewTokenKind] = useState<Token["kind"]>("hero");
  const [newTokenHp, setNewTokenHp] = useState(10);
  const [newTokenInitiative, setNewTokenInitiative] = useState(10);
  const dirtyRef = useRef(false);
  const updatedAtRef = useRef<string | null>(null);
  const initiative = useMemo(() => [...tokens].sort((a, b) => b.initiative - a.initiative), [tokens]);
  const activeToken = initiative.length ? initiative[(round - 1) % initiative.length] : undefined;
  const selected = tokens.find(token => token.id === selectedId);
  const getEditorSnapshot = (): EditorSnapshot => cloneEditorSnapshot({ tokens, objects, layerVisibility, layerLocks, mapView });
  const recordEditorHistory = () => {
    if (historyGroupRef.current) return;
    const snapshot = getEditorSnapshot();
    setEditorHistory(current => ({ past: [...current.past.slice(-49), snapshot], future: [] }));
  };
  const beginHistoryGroup = () => {
    if (historyGroupRef.current) return;
    historyGroupRef.current = true;
    historyGroupStartRef.current = getEditorSnapshot();
  };
  const finishHistoryGroup = () => {
    if (!historyGroupRef.current) return;
    historyGroupRef.current = false;
    const before = historyGroupStartRef.current;
    const after = getEditorSnapshot();
    historyGroupStartRef.current = null;
    if (before && JSON.stringify(before) !== JSON.stringify(after)) {
      setEditorHistory(current => ({ past: [...current.past.slice(-49), before], future: [] }));
    }
  };
  const updateObjects = (next: MapObject[]) => { recordEditorHistory(); setObjects(next); };
  const updateLayerVisibility = (next: LayerVisibility) => { recordEditorHistory(); setLayerVisibility(next); };
  const updateLayerLocks = (next: LayerLocks) => { recordEditorHistory(); setLayerLocks(next); };
  const updateMapView = (patch: Partial<MapView>) => { recordEditorHistory(); setMapView(value => ({ ...value, ...patch })); };
  const undoEditor = () => {
    const target = editorHistory.past[editorHistory.past.length - 1];
    if (!target || !canEdit) return;
    const current = getEditorSnapshot();
    setEditorHistory({ past: editorHistory.past.slice(0, -1), future: [...editorHistory.future, current].slice(-50) });
    setTokens(target.tokens); setObjects(target.objects); setLayerVisibility(target.layerVisibility); setLayerLocks(target.layerLocks); setMapView(target.mapView);
  };
  const redoEditor = () => {
    const target = editorHistory.future[editorHistory.future.length - 1];
    if (!target || !canEdit) return;
    const current = getEditorSnapshot();
    setEditorHistory({ past: [...editorHistory.past, current].slice(-50), future: editorHistory.future.slice(0, -1) });
    setTokens(target.tokens); setObjects(target.objects); setLayerVisibility(target.layerVisibility); setLayerLocks(target.layerLocks); setMapView(target.mapView);
  };

  const applyRemoteState = (response: TableResponse) => {
    const state = response.state ?? {};
    // Older demo scenes had no room configuration. Migrate those to a genuinely empty room.
    if (state.room?.configured) {
      setRoom({ ...state.room, snapToGrid: state.room.snapToGrid ?? true, gridCellSizePx: state.room.gridCellSizePx ?? 38 });
      setRoomName(state.room.name);
      setRoomDescription(state.room.description);
      setMapTheme(state.room.mapTheme);
      setGrid(state.room.grid);
      setTokens(Array.isArray(state.tokens) ? state.tokens : []);
      setObjects(Array.isArray(state.objects) ? state.objects : []);
      setLayerVisibility({ ...defaultLayerVisibility, ...(state.layerVisibility ?? {}) });
      setLayerLocks({ ...defaultLayerLocks, ...(state.layerLocks ?? {}) });
      setMapAsset(state.mapAsset ?? null);
      setMapView(state.mapView ?? { ...defaultMapView });
      setLog(Array.isArray(state.log) ? state.log : []);
    } else {
      setRoom({ ...emptyRoom });
      setTokens([]);
      setObjects([]);
      setLayerVisibility({ ...defaultLayerVisibility });
      setLayerLocks({ ...defaultLayerLocks });
      setMapAsset(null);
      setMapView({ ...defaultMapView });
      setLog([]);
    }
    if (typeof state.round === "number") setRound(state.round);
    if (typeof response.permissions?.canEdit === "boolean") setCanEdit(response.permissions.canEdit);
    updatedAtRef.current = response.updatedAt;
    setLastUpdated(response.updatedAt ? new Date(response.updatedAt).toLocaleTimeString() : "");
  };

  useEffect(() => {
    if (!campaignId) return;
    if (!remoteEnabled) {
      try {
        const saved = window.localStorage.getItem(localKey(campaignId));
        if (saved) {
          const state = JSON.parse(saved) as Partial<TableState>;
          if (state.room?.configured) {
            setRoom({ ...state.room, snapToGrid: state.room.snapToGrid ?? true });
            setRoomName(state.room.name);
            setRoomDescription(state.room.description);
            setMapTheme(state.room.mapTheme);
            setGrid(state.room.grid);
            setTokens(Array.isArray(state.tokens) ? state.tokens : []);
            setObjects(Array.isArray(state.objects) ? state.objects : []);
            setLayerVisibility({ ...defaultLayerVisibility, ...(state.layerVisibility ?? {}) });
            setLayerLocks({ ...defaultLayerLocks, ...(state.layerLocks ?? {}) });
            setMapAsset(state.mapAsset ?? null);
            setMapView(state.mapView ?? { ...defaultMapView });
            setLog(Array.isArray(state.log) ? state.log : []);
            if (typeof state.round === "number") setRound(state.round);
          }
        }
      } catch { /* Invalid local state starts with an empty room. */ }
      setTableLoaded(true);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const response = await apiRequest<TableResponse>(`/campaigns/${campaignId}/table`);
        if (!active) return;
        applyRemoteState(response);
        setTableError("");
      } catch (error) {
        if (active) setTableError(error instanceof Error ? error.message : "Не удалось загрузить игровую комнату.");
      } finally {
        if (active) setTableLoaded(true);
      }
    };
    void load();
    const poll = window.setInterval(async () => {
      if (dirtyRef.current) return;
      try {
        const response = await apiRequest<TableResponse>(`/campaigns/${campaignId}/table`);
        if (!active || !response.updatedAt || response.updatedAt === updatedAtRef.current) return;
        applyRemoteState(response);
      } catch { /* Keep the last known room visible during temporary network loss. */ }
    }, 3000);
    return () => { active = false; window.clearInterval(poll); };
  }, [campaignId, remoteEnabled]);

  useEffect(() => {
    if (!campaignId || !tableLoaded) return;
    const state: TableState = { room, tokens, objects, layerVisibility, layerLocks, mapAsset, mapView, round, log };
    if (!remoteEnabled) {
      try { window.localStorage.setItem(localKey(campaignId), JSON.stringify(state)); } catch { /* Local storage may be unavailable. */ }
      return;
    }
    if (!canEdit) return;
    dirtyRef.current = true;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await apiRequest<TableResponse>(`/campaigns/${campaignId}/table`, { method: "PUT", body: JSON.stringify({ state }) });
        updatedAtRef.current = response.updatedAt;
        setLastUpdated(response.updatedAt ? new Date(response.updatedAt).toLocaleTimeString() : "");
        setTableError("");
      } catch (error) {
        setTableError(error instanceof Error ? error.message : "Не удалось сохранить комнату.");
      } finally {
        dirtyRef.current = false;
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [room, tokens, objects, layerVisibility, layerLocks, mapAsset, mapView, round, log, campaignId, remoteEnabled, tableLoaded, canEdit]);

  useEffect(() => {
    if (!remoteEnabled || !campaignId) return;
    let active = true;
    apiRequest<CampaignCharacter[]>(`/characters/campaigns/${campaignId}`)
      .then(items => { if (active) { setCampaignCharacters(items); setRosterError(""); } })
      .catch(error => { if (active) setRosterError(error instanceof Error ? error.message : "Не удалось загрузить персонажей кампании."); });
    return () => { active = false; };
  }, [campaignId, remoteEnabled]);

  const addCampaignCharacter = (character: CampaignCharacter) => {
    if (!canEdit || layerLocks.figures) return;
    const data = character.data ?? {};
    const hp = (data.hitPoints as { maximum?: number } | undefined)?.maximum ?? 1;
    const initiativeValue = Number(data.initiative ?? 0);
    const token: Token = { id: newId(), name: character.name, kind: "hero", x: 50, y: 50, hp: Number(hp), maxHp: Number(hp), color: "gold", initiative: initiativeValue };
    recordEditorHistory();
    setTokens(items => [...items, token]);
    addLog(`Персонаж кампании добавлен на карту: ${character.name}.`);
  };

  const addLog = (text: string, tone: LogEntry["tone"] = "muted") => {
    setLog(items => [...items.slice(-99), { id: Date.now() + Math.floor(Math.random() * 1000), text, tone }]);
  };
  const handleMapFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setTableError("Размер изображения карты не должен превышать 15 МБ.");
      return;
    }
    if (!remoteEnabled || !campaignId || !canEdit) {
      setTableError("Загрузка карты доступна мастеру в общей кампании.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setMapUploading(true);
    try {
      const uploaded = await apiRequest<MapAsset>(`/campaigns/${campaignId}/table/map`, { method: "POST", body: formData });
      setMapAsset(uploaded);
      setMapView({ ...defaultMapView });
      addLog("Изображение карты загружено в постоянное хранилище.", "gold");
    } catch (error) {
      setTableError(error instanceof Error ? error.message : "Не удалось загрузить изображение карты.");
    } finally {
      setMapUploading(false);
    }
  };
  const removeMapAsset = async () => {
    if (!mapAsset || !campaignId || !remoteEnabled || !canEdit) return;
    if (!window.confirm("Удалить загруженную подложку карты?")) return;
    setMapUploading(true);
    try {
      await apiRequest<{ deleted: boolean }>(`/campaigns/${campaignId}/table/map`, {
        method: "DELETE",
        body: JSON.stringify({ key: mapAsset.key }),
      });
      setMapAsset(null);
      setMapView({ ...defaultMapView });
      addLog("Подложка карты удалена.", "gold");
    } catch (error) {
      setTableError(error instanceof Error ? error.message : "Не удалось удалить изображение карты.");
    } finally {
      setMapUploading(false);
    }
  };
  const saveRoom = (event: React.FormEvent) => {
    event.preventDefault();
    if (!roomName.trim()) return;
    setRoom({ configured: true, published: false, name: roomName.trim(), description: roomDescription.trim(), mapTheme, grid, snapToGrid: room.snapToGrid ?? true, gridCellSizePx: room.gridCellSizePx ?? 38 });
    setEditingRoom(false);
    addLog("Мастер подготовил игровую комнату.", "gold");
  };
  const togglePublication = () => {
    if (!canEdit || !room.configured) return;
    const published = !room.published;
    setRoom(value => ({ ...value, published }));
    addLog(published ? "Мастер опубликовал игровую комнату для игроков." : "Мастер скрыл комнату от игроков.", "gold");
  };
  const addToken = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTokenName.trim() || !canEdit || layerLocks.figures) return;
    const color = newTokenKind === "enemy" ? "red" : newTokenKind === "ally" ? "blue" : "gold";
    const token: Token = { id: newId(), name: newTokenName.trim(), kind: newTokenKind, x: 25 + Math.random() * 50, y: 25 + Math.random() * 50, hp: newTokenHp, maxHp: newTokenHp, color, initiative: newTokenInitiative };
    recordEditorHistory();
    setTokens(items => [...items, token]);
    setSelectedId(token.id);
    addLog(`На карту добавлен участник: ${token.name}.`);
    setNewTokenName("");
  };
  const rollD20 = async () => {
    if (remoteEnabled) {
      setDiceBusy(true);
      try {
        const result = await apiRequest<{ rolls: number[]; total: number }>("/dice/roll", { method: "POST", body: JSON.stringify({ count: 1, sides: 20, modifier: 0, mode: "normal" }) });
        addLog(`Бросок d20: ${result.rolls[0]} (итого ${result.total}).`, result.rolls[0] === 20 ? "gold" : "muted");
      } catch (error) { setTableError(error instanceof Error ? error.message : "Не удалось выполнить бросок."); }
      finally { setDiceBusy(false); }
      return;
    }
    const value = Math.floor(Math.random() * 20) + 1;
    addLog(`Локальный бросок d20: ${value}.`, value === 20 ? "gold" : "muted");
  };
  const nextTurn = () => {
    if (!canEdit || !initiative.length) return;
    if (round > 0) setRound(value => value + 1);
    addLog(`Начался раунд ${round + 1}.`, "gold");
  };
  const moveToken = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId || !canEdit || layerLocks.figures) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = zoom / 100;
    const localX = (event.clientX - rect.left - rect.width / 2) / scale + rect.width / 2;
    const localY = (event.clientY - rect.top - rect.height / 2) / scale + rect.height / 2;
    const rawX = localX;
    const rawY = localY;
    const snap = room.grid && room.snapToGrid;
    const cellSize = Math.max(12, Math.min(120, room.gridCellSizePx ?? 38));
    const x = Math.max(4, Math.min(96, (snap ? Math.round(rawX / cellSize) * cellSize : rawX) / rect.width * 100));
    const y = Math.max(5, Math.min(95, (snap ? Math.round(rawY / cellSize) * cellSize : rawY) / rect.height * 100));
    setTokens(items => items.map(token => token.id === draggingId ? { ...token, x, y } : token));
  };
  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    addLog(`Заметка: ${message.trim()}`);
    setMessage("");
  };

  return <section className="tabletop-page">
    <div className="tabletop-heading">
      <div>
        <button className="table-back" onClick={onBack}><ArrowLeft size={16}/> К кампаниям</button>
        <div className="eyebrow"><span/> ИГРОВАЯ СЕССИЯ</div>
        <h1>{room.configured ? room.name : campaignName}</h1>
        <p className="subtitle">{room.configured ? "Комната мастера" : "Подготовка игровой комнаты"}</p>
      </div>
      <div className="tabletop-status"><span className="live-dot"/> {remoteEnabled ? "Общая комната" : "Локальная комната"} <small>{remoteEnabled ? (canEdit ? `Автосохранение · ${lastUpdated || "синхронизация"}` : "Режим просмотра · обновление каждые 3 сек") : "Данные сохраняются в этом браузере"}</small></div>
    </div>
    {tableError && <p className="validation-note" role="alert">{tableError}</p>}
    {!tableLoaded && <p className="table-sync-note">Загружаем сохранённую комнату…</p>}

    {!canEdit && !room.configured ? <section className="room-waiting-panel"><div className="room-setup-icon"><Eye size={24}/></div><div><span className="eyebrow">ИГРОВАЯ КОМНАТА</span><h2>Мастер готовит сессию</h2><p>Комната пока не опубликована. Когда ведущий завершит подготовку и откроет доступ, карта и участники появятся здесь автоматически.</p></div></section> : (!room.configured || editingRoom) ? <section className="room-setup-panel">
      <div className="room-setup-intro"><div className="room-setup-icon"><Map size={23}/></div><div><span className="eyebrow">МАСТЕРСКАЯ ВЕДУЩЕГО</span><h2>{room.configured ? "Настройки комнаты" : "Подготовь игровую комнату"}</h2><p>Сцена не будет заполнена автоматически. Выбери параметры и сам размести участников перед началом игры.</p></div></div>
      <form className="room-setup-form" onSubmit={saveRoom}>
        <label>Название комнаты<input value={roomName} onChange={event => setRoomName(event.target.value)} placeholder="Название приключения" required disabled={!canEdit}/></label>
        <label>Описание и вступление<textarea value={roomDescription} onChange={event => setRoomDescription(event.target.value)} placeholder="Опиши место, атмосферу и начальные условия…" rows={3} disabled={!canEdit}/></label>
        <label>Основа игровой карты<select value={mapTheme} onChange={event => setMapTheme(event.target.value as RoomSettings["mapTheme"])} disabled={!canEdit}><option value="sand">Песчаная карта</option><option value="stone">Каменная площадка</option><option value="forest">Лесная поляна</option></select></label>
        <label className="room-grid-toggle"><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} disabled={!canEdit}/> Показывать игровую сетку</label>
         <label>Размер клетки сетки (пиксели)<input type="number" min="12" max="120" step="1" value={room.gridCellSizePx ?? 38} onChange={event => setRoom(value => ({ ...value, gridCellSizePx: Math.max(12, Math.min(120, Number(event.target.value) || 38)) }))} disabled={!canEdit}/></label>
        <label className="room-grid-toggle"><input type="checkbox" checked={room.snapToGrid} onChange={event => setRoom(value => ({ ...value, snapToGrid: event.target.checked }))} disabled={!canEdit || !grid}/> Привязывать фигуры и объекты к сетке</label>
        {canEdit ? <div className="room-setup-actions"><button className="button button-primary" type="submit"><Settings2 size={16}/> {room.configured ? "Сохранить настройки" : "Создать комнату"}</button>{room.configured && <button className="button button-secondary" type="button" onClick={() => setEditingRoom(false)}>Отмена</button>}</div> : <p className="validation-note">Настраивать комнату может только мастер или помощник.</p>}
      </form>
    </section> : <>
      {canEdit && <div className={`room-publication-bar ${room.published ? "is-published" : ""}`}><div><strong>{room.published ? "Комната опубликована" : "Черновик комнаты"}</strong><span>{room.published ? "Игроки видят текущую сцену и её изменения." : "Игроки пока не видят карту, фигуры и журнал."}</span></div><button className="button button-primary" onClick={togglePublication}>{room.published ? "Скрыть от игроков" : "Опубликовать игрокам"}</button></div>}
      {room.description && <p className="room-description">{room.description}</p>}
      <div className="tabletop-layout">
        <div className="tabletop-center">
          <div className="table-toolbar">
            <div className="table-tool-group">
              <input ref={mapFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleMapFileChange}/><button type="button" title="Загрузить изображение карты" aria-label="Загрузить изображение карты" disabled={!canEdit || !remoteEnabled || layerLocks.background || mapUploading} onClick={() => mapFileInputRef.current?.click()}><ImagePlus size={16}/></button>{mapAsset && <button type="button" title="Удалить подложку карты" aria-label="Удалить подложку карты" disabled={!canEdit || layerLocks.background || mapUploading} onClick={removeMapAsset}><Trash2 size={16}/></button>}<button title="Отменить последнее действие" aria-label="Отменить последнее действие" disabled={!canEdit || editorHistory.past.length === 0} onClick={undoEditor}><Undo2 size={16}/></button><button title="Повторить действие" aria-label="Повторить действие" disabled={!canEdit || editorHistory.future.length === 0} onClick={redoEditor}><Redo2 size={16}/></button><button title="Показать или скрыть сетку" className={room.grid ? "tool-active" : ""} onClick={() => setRoom(value => ({ ...value, grid: !value.grid }))} disabled={!canEdit}><Grid3X3 size={17}/></button><button title={room.snapToGrid ? "Отключить привязку к сетке" : "Включить привязку к сетке"} className={room.snapToGrid && room.grid ? "tool-active" : ""} onClick={() => setRoom(value => ({ ...value, snapToGrid: !value.snapToGrid }))} disabled={!canEdit || !room.grid}><Magnet size={16}/></button><label className="grid-cell-toolbar">Клетка <input aria-label="Размер клетки сетки в пикселях" type="number" min="12" max="120" step="1" value={room.gridCellSizePx ?? 38} onChange={event => setRoom(value => ({ ...value, gridCellSizePx: Math.max(12, Math.min(120, Number(event.target.value) || 38)) }))} disabled={!canEdit || layerLocks.figures}/><span>px</span></label>
              <button title="Уменьшить" onClick={() => setZoom(value => Math.max(60, value - 10))}><ZoomOut size={17}/></button><span>{zoom}%</span><button title="Увеличить" onClick={() => setZoom(value => Math.min(150, value + 10))}><ZoomIn size={17}/></button>
            </div>
            <div className="table-tool-group"><span className="scene-label"><Eye size={14}/> {canEdit ? "Редактор комнаты" : "Только просмотр"}</span></div>
          </div>
          <div className={`battle-map map-${room.mapTheme} ${room.grid ? "with-grid" : ""} ${mapAsset && visibleLayers.background ? "has-uploaded-map" : ""}`} style={{ "--grid-cell-size": `${room.gridCellSizePx ?? 38}px`, "--map-zoom": zoom / 100, "--map-image-scale": mapView.scale, "--map-offset-x": `${mapView.x}%`, "--map-offset-y": `${mapView.y}%` } as React.CSSProperties} onPointerMove={moveToken} onPointerUp={() => { setDraggingId(null); finishHistoryGroup(); }} onPointerLeave={() => { setDraggingId(null); finishHistoryGroup(); }}>
            {mapAsset && visibleLayers.background && <img className="uploaded-map-image" src={mapAsset.url} alt="Загруженная карта игровой комнаты"/>}
            {mapAsset && visibleLayers.background && canEdit && !layerLocks.background && <div className="map-image-controls" onPointerDown={event => event.stopPropagation()}>
              <strong>Подгонка подложки</strong>
              <label>Масштаб <output>{Math.round(mapView.scale * 100)}%</output>
                <input type="range" min="50" max="200" step="5" value={Math.round(mapView.scale * 100)} onPointerDown={beginHistoryGroup} onPointerUp={finishHistoryGroup} onChange={event => updateMapView({ scale: Number(event.target.value) / 100 })}/>
              </label>
              <label>Смещение X <output>{mapView.x}%</output>
                <input type="range" min="-50" max="50" step="1" value={mapView.x} onPointerDown={beginHistoryGroup} onPointerUp={finishHistoryGroup} onChange={event => updateMapView({ x: Number(event.target.value) })}/>
              </label>
              <label>Смещение Y <output>{mapView.y}%</output>
                <input type="range" min="-50" max="50" step="1" value={mapView.y} onPointerDown={beginHistoryGroup} onPointerUp={finishHistoryGroup} onChange={event => updateMapView({ y: Number(event.target.value) })}/>
              </label>
              <button type="button" onClick={() => updateMapView({ ...defaultMapView })}>Сбросить положение</button>
            </div>}
            <div className="map-scale" style={{ transform: `scale(${zoom / 100})` }}>
              {(visibleLayers.figures ? tokens : []).map(token => <button key={token.id} className={`map-token token-${token.color} ${selectedId === token.id ? "token-selected" : ""} ${activeToken?.id === token.id ? "token-active" : ""}`} style={{ left: `${token.x}%`, top: `${token.y}%`, cursor: canEdit ? "grab" : "default" }} onPointerDown={event => { if (!canEdit || layerLocks.figures) { setSelectedId(token.id); return; } event.preventDefault(); setSelectedId(token.id); beginHistoryGroup(); setDraggingId(token.id); event.currentTarget.setPointerCapture(event.pointerId); }} onClick={() => setSelectedId(token.id)} title={token.name}>
                <span className="token-glyph">{token.kind === "enemy" ? "!" : token.kind === "ally" ? "✦" : "♟"}</span><span className="token-label">{token.name}</span><span className="token-health"><i style={{ width: `${(token.hp / token.maxHp) * 100}%` }}/></span>
              </button>)}
            </div>
            {tokens.length === 0 && !mapAsset && <div className="empty-map-hint"><Map size={27}/><strong>Карта пока пуста</strong><span>Добавь участников и расставь их на поле. Окружение и декорации можно будет разместить в редакторе карты.</span></div>}
            <RoomMapEditor objects={objects} onChange={updateObjects} canEdit={canEdit} visibleLayers={layerVisibility} onVisibilityChange={updateLayerVisibility} layerLocks={layerLocks} onLayerLocksChange={updateLayerLocks} onEditStart={beginHistoryGroup} onEditEnd={finishHistoryGroup} snapToGrid={room.grid && room.snapToGrid} gridCellSizePx={room.gridCellSizePx ?? 38}/><div className="map-coordinates"><span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span><span>G</span><span>H</span></div>
          </div>
          <div className="map-caption"><span><i className="legend-dot hero-dot"/> Союзники</span><span><i className="legend-dot enemy-dot"/> Противники</span><span>{canEdit ? "Перетаскивай фигуры мышью" : "Сцена доступна для просмотра"}</span></div>
        </div>
        <aside className="table-sidebar">
          <section className="table-panel">
            <div className="table-panel-title"><div><Swords size={16}/><strong>Инициатива</strong></div><span>Раунд {round}</span></div>
            {initiative.length ? <div className="initiative-list">{initiative.map(token => <button key={token.id} className={`initiative-row ${activeToken?.id === token.id ? "initiative-current" : ""} ${selectedId === token.id ? "initiative-selected" : ""}`} onClick={() => setSelectedId(token.id)}><span className={`initiative-avatar token-${token.color}`}>{token.kind === "enemy" ? "!" : "♟"}</span><span className="initiative-name">{token.name}<small>{token.kind === "enemy" ? "Противник" : "Участник"}</small></span><b>{token.initiative}</b>{activeToken?.id === token.id && <i className="turn-indicator"/>}</button>)}</div> : <p className="room-empty-note">Добавленные участники появятся здесь.</p>}
            <button className="button button-primary full-width next-turn" onClick={nextTurn} disabled={!canEdit || !initiative.length}>Следующий раунд <ChevronRight size={16}/></button>
          </section>
          {selected && <section className="table-panel selected-panel">
            <div className="table-panel-title"><div><Shield size={16}/><strong>Выбранная фигура</strong></div></div>
            <div className="selected-token-title"><span className={`initiative-avatar token-${selected.color}`}>{selected.kind === "enemy" ? "!" : "♟"}</span><div><strong>{selected.name}</strong><small>{selected.kind === "enemy" ? "Противник" : "Союзник"}</small></div></div>
            <div className="hp-line"><span>Хиты</span><b>{selected.hp} / {selected.maxHp}</b></div><div className="hp-track"><i style={{ width: `${(selected.hp / selected.maxHp) * 100}%` }}/></div>
            <div className="token-actions"><button disabled={!canEdit || layerLocks.figures} onClick={() => { recordEditorHistory(); setTokens(items => items.map(token => token.id === selected.id ? { ...token, hp: Math.max(0, token.hp - 1) } : token)); }}><Minus size={14}/> Урон</button><button disabled={!canEdit || layerLocks.figures} onClick={() => { recordEditorHistory(); setTokens(items => items.map(token => token.id === selected.id ? { ...token, hp: Math.min(token.maxHp, token.hp + 1) } : token)); }}><Plus size={14}/> Лечение</button><button disabled={!canEdit || layerLocks.figures} onClick={() => { recordEditorHistory(); setTokens(items => items.filter(token => token.id !== selected.id)); setSelectedId(null); addLog(`${selected.name} удалён с карты.`); }}>Убрать</button></div>
          </section>}
          <section className="table-panel">
            <div className="table-panel-title"><div><UserPlus size={16}/><strong>Персонажи кампании</strong></div><span>{campaignCharacters.length}</span></div>
            {rosterError && <p className="room-empty-note">{rosterError}</p>}
            {campaignCharacters.length ? <div className="campaign-roster">{campaignCharacters.map(character => <div className="campaign-roster-row" key={character.id}><span>{character.name}</span><button type="button" disabled={!canEdit || layerLocks.figures || tokens.some(token => token.name === character.name)} onClick={() => addCampaignCharacter(character)}>{tokens.some(token => token.name === character.name) ? "На карте" : "Добавить"}</button></div>)}</div> : <p className="room-empty-note">{remoteEnabled ? "В кампанию пока не добавлены персонажи. Добавь персонажей в разделе кампании." : "Список персонажей кампании доступен после подключения API."}</p>}
          </section>
          <section className="table-panel">
            <div className="table-panel-title"><div><UserPlus size={16}/><strong>Добавить NPC или противника</strong></div></div>
            <form className="add-token-form" onSubmit={addToken}>
              <label>Имя фигуры<input value={newTokenName} onChange={event => setNewTokenName(event.target.value)} placeholder="Имя персонажа или существа" required disabled={!canEdit || layerLocks.figures}/></label>
              <div className="add-token-fields"><label>Тип<select value={newTokenKind} onChange={event => setNewTokenKind(event.target.value as Token["kind"])} disabled={!canEdit}><option value="hero">Герой</option><option value="ally">Союзник</option><option value="enemy">Противник</option></select></label><label>Хиты<input type="number" min="1" max="999" value={newTokenHp} onChange={event => setNewTokenHp(Number(event.target.value))} disabled={!canEdit || layerLocks.figures}/></label><label>Инициатива<input type="number" min="-10" max="40" value={newTokenInitiative} onChange={event => setNewTokenInitiative(Number(event.target.value))} disabled={!canEdit || layerLocks.figures}/></label></div>
              <button className="button button-secondary full-width" type="submit" disabled={!canEdit || layerLocks.figures}><Plus size={15}/> Добавить на карту</button>
            </form>
          </section>
          <section className="table-panel dice-panel"><div className="table-panel-title"><div><Dice5 size={16}/><strong>Быстрый бросок</strong></div></div><button className="dice-roll-button" onClick={rollD20} disabled={diceBusy}><Dice5 size={19}/> {diceBusy ? "Бросаем…" : "Бросить d20"}</button><small>{remoteEnabled ? "Результат рассчитывается сервером и попадает в журнал." : "Локальный демонстрационный бросок."}</small></section>
          {canEdit && <button className="button button-secondary full-width" onClick={() => setEditingRoom(true)}><Settings2 size={15}/> Настройки комнаты</button>}
        </aside>
      </div>
      <section className="table-panel table-events-panel">
        <div className="table-panel-title"><div><Users size={16}/><strong>События и журнал игры</strong></div><span>{log.length} записей</span></div>
        <div className="table-log table-log-below">{log.length ? log.map(entry => <p key={entry.id} className={`log-${entry.tone}`}>{entry.text}</p>) : <p className="room-empty-note">Событий пока нет. Здесь будут отображаться броски, заметки и ход игры.</p>}</div>
        <form className="table-chat-form" onSubmit={sendMessage}><input value={message} onChange={event => setMessage(event.target.value)} placeholder="Добавить заметку в журнал…"/><button aria-label="Добавить заметку" type="submit"><Send size={15}/></button></form>
      </section>
    </>}
  </section>;
}
