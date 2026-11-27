import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Dice5, Eye, Grid3X3, Minus, Plus, Send, Shield, Swords, Users, ZoomIn, ZoomOut } from "lucide-react";
import { apiRequest, isApiConfigured } from "./api";
import "./styles/tabletop.css";

type Token = { id: string; name: string; kind: "hero" | "enemy" | "ally"; x: number; y: number; hp: number; maxHp: number; color: string; initiative: number };
type LogEntry = { id: number; text: string; tone: "gold" | "muted" | "danger" };
type TableState = { tokens: Token[]; round: number; log: LogEntry[] };
type TableResponse = { state: Partial<TableState>; updatedAt: string | null; permissions?: { canEdit: boolean } };
const initialTokens: Token[] = [
  { id: "hero", name: "Искатель", kind: "hero", x: 25, y: 38, hp: 12, maxHp: 12, color: "gold", initiative: 16 },
  { id: "ally", name: "Спутник", kind: "ally", x: 39, y: 57, hp: 9, maxHp: 9, color: "blue", initiative: 12 },
  { id: "enemy-a", name: "Гоблин", kind: "enemy", x: 68, y: 37, hp: 7, maxHp: 7, color: "red", initiative: 14 },
  { id: "enemy-b", name: "Гоблин", kind: "enemy", x: 77, y: 59, hp: 7, maxHp: 7, color: "red", initiative: 9 },
];
const localKey = (id: string) => `dnd-dcorp-table-${id}`;

export default function GameTable({ campaignName, campaignId, isGuest, onBack }: { campaignName: string; campaignId?: string; isGuest: boolean; onBack: () => void }) {
  const remoteEnabled = Boolean(campaignId && !isGuest && isApiConfigured());
  const [tokens, setTokens] = useState(initialTokens);
  const [selectedId, setSelectedId] = useState("hero");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [round, setRound] = useState(1);
  const [turn, setTurn] = useState(0);
  const [message, setMessage] = useState("");
  const [log, setLog] = useState<LogEntry[]>([
    { id: 1, text: "Игровая сцена подготовлена.", tone: "muted" },
    { id: 2, text: "Порядок инициативы определён.", tone: "gold" },
  ]);
  const [showGrid, setShowGrid] = useState(true);
  const [canEdit, setCanEdit] = useState(!remoteEnabled);
  const [tableLoaded, setTableLoaded] = useState(!remoteEnabled);
  const [tableError, setTableError] = useState("");
  const [diceBusy, setDiceBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const dirtyRef = useRef(false);
  const updatedAtRef = useRef<string | null>(null);
  const initiative = useMemo(() => [...tokens].sort((a, b) => b.initiative - a.initiative), [tokens]);
  const activeToken = initiative[turn % Math.max(initiative.length, 1)];
  const selected = tokens.find(token => token.id === selectedId) ?? tokens[0];

  const applyRemoteState = (response: TableResponse) => {
    const state = response.state ?? {};
    if (Array.isArray(state.tokens) && state.tokens.length) setTokens(state.tokens);
    if (typeof state.round === "number") setRound(state.round);
    if (Array.isArray(state.log)) setLog(state.log);
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
          if (Array.isArray(state.tokens) && state.tokens.length) setTokens(state.tokens);
          if (typeof state.round === "number") setRound(state.round);
          if (Array.isArray(state.log)) setLog(state.log);
        }
      } catch { /* Ignore invalid local table data and start a fresh scene. */ }
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
        if (active) setTableError(error instanceof Error ? error.message : "Не удалось загрузить игровой стол.");
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
      } catch { /* Keep the last known scene visible during temporary network loss. */ }
    }, 3000);
    return () => { active = false; window.clearInterval(poll); };
  }, [campaignId, remoteEnabled]);

  useEffect(() => {
    if (!campaignId || !tableLoaded) return;
    const state: TableState = { tokens, round, log };
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
        setTableError(error instanceof Error ? error.message : "Не удалось сохранить игровой стол.");
      } finally {
        dirtyRef.current = false;
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [tokens, round, log, campaignId, remoteEnabled, tableLoaded, canEdit]);

  const addLog = (text: string, tone: LogEntry["tone"] = "muted") => {
    setLog(items => [...items.slice(-19), { id: Date.now() + Math.floor(Math.random() * 1000), text, tone }]);
  };
  const rollD20 = async () => {
    if (remoteEnabled) {
      setDiceBusy(true);
      try {
        const result = await apiRequest<{ rolls: number[]; total: number }>("/dice/roll", { method: "POST", body: JSON.stringify({ count: 1, sides: 20, modifier: 0, mode: "normal" }) });
        addLog(`Искатель бросает d20: ${result.rolls[0]} (итого ${result.total}).`, result.rolls[0] === 20 ? "gold" : "muted");
      } catch (error) { setTableError(error instanceof Error ? error.message : "Не удалось выполнить бросок."); }
      finally { setDiceBusy(false); }
      return;
    }
    const value = Math.floor(Math.random() * 20) + 1;
    addLog(`Локальный бросок d20: ${value}.`, value === 20 ? "gold" : "muted");
  };
  const nextTurn = () => {
    if (!canEdit) return;
    if (turn + 1 >= initiative.length) {
      setTurn(0);
      setRound(value => value + 1);
      addLog(`Начался раунд ${round + 1}.`, "gold");
    } else setTurn(value => value + 1);
  };
  const moveToken = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId || !canEdit) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(4, Math.min(96, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((event.clientY - rect.top) / rect.height) * 100));
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
        <h1>{campaignName}</h1>
        <p className="subtitle">Игровой стол · Раунд {round}</p>
      </div>
      <div className="tabletop-status"><span className="live-dot"/> {remoteEnabled ? "Общая сцена" : "Локальная сцена"} <small>{remoteEnabled ? (canEdit ? `Автосохранение · ${lastUpdated || "синхронизация"}` : "Режим просмотра · обновление каждые 3 сек") : "Данные сохраняются в этом браузере"}</small></div>
    </div>
    {tableError && <p className="validation-note" role="alert">{tableError}</p>}
    {!tableLoaded && <p className="table-sync-note">Загружаем сохранённую сцену кампании…</p>}
    <div className="tabletop-layout">
      <div className="tabletop-center">
        <div className="table-toolbar">
          <div className="table-tool-group">
            <button title="Показать или скрыть сетку" className={showGrid ? "tool-active" : ""} onClick={() => setShowGrid(value => !value)}><Grid3X3 size={17}/></button>
            <button title="Уменьшить" onClick={() => setZoom(value => Math.max(60, value - 10))}><ZoomOut size={17}/></button>
            <span>{zoom}%</span>
            <button title="Увеличить" onClick={() => setZoom(value => Math.min(150, value + 10))}><ZoomIn size={17}/></button>
          </div>
          <div className="table-tool-group"><span className="scene-label"><Eye size={14}/> {canEdit ? "Управление сценой" : "Только просмотр"}</span></div>
        </div>
        <div className={`battle-map ${showGrid ? "with-grid" : ""}`} onPointerMove={moveToken} onPointerUp={() => setDraggingId(null)} onPointerLeave={() => setDraggingId(null)}>
          <div className="map-scale" style={{ transform: `scale(${zoom / 100})` }}>
            <div className="map-decoration map-stone-one"/><div className="map-decoration map-stone-two"/>
            <div className="map-ruin ruin-a"/><div className="map-ruin ruin-b"/><div className="map-water"/>
            {tokens.map(token => <button key={token.id} className={`map-token token-${token.color} ${selectedId === token.id ? "token-selected" : ""} ${activeToken?.id === token.id ? "token-active" : ""}`} style={{ left: `${token.x}%`, top: `${token.y}%`, cursor: canEdit ? "grab" : "default" }} onPointerDown={event => { if (!canEdit) { setSelectedId(token.id); return; } event.preventDefault(); setSelectedId(token.id); setDraggingId(token.id); event.currentTarget.setPointerCapture(event.pointerId); }} onClick={() => setSelectedId(token.id)} title={token.name}>
              <span className="token-glyph">{token.kind === "enemy" ? "!" : token.kind === "ally" ? "✦" : "♟"}</span><span className="token-label">{token.name}</span><span className="token-health"><i style={{ width: `${(token.hp / token.maxHp) * 100}%` }}/></span>
            </button>)}
          </div>
          <div className="map-coordinates"><span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span><span>G</span><span>H</span></div>
        </div>
        <div className="map-caption"><span><i className="legend-dot hero-dot"/> Союзники</span><span><i className="legend-dot enemy-dot"/> Противники</span><span>{canEdit ? "Перетаскивай фигуры мышью" : "Сцена доступна для просмотра"}</span></div>
      </div>
      <aside className="table-sidebar">
        <section className="table-panel">
          <div className="table-panel-title"><div><Swords size={16}/><strong>Инициатива</strong></div><span>Раунд {round}</span></div>
          <div className="initiative-list">{initiative.map(token => <button key={token.id} className={`initiative-row ${activeToken?.id === token.id ? "initiative-current" : ""} ${selectedId === token.id ? "initiative-selected" : ""}`} onClick={() => setSelectedId(token.id)}><span className={`initiative-avatar token-${token.color}`}>{token.kind === "enemy" ? "!" : "♟"}</span><span className="initiative-name">{token.name}<small>{token.kind === "enemy" ? "Противник" : "Участник"}</small></span><b>{token.initiative}</b>{activeToken?.id === token.id && <i className="turn-indicator"/>}</button>)}</div>
          <button className="button button-primary full-width next-turn" onClick={nextTurn} disabled={!canEdit}>Следующий ход <ChevronRight size={16}/></button>
        </section>
        <section className="table-panel selected-panel">
          <div className="table-panel-title"><div><Shield size={16}/><strong>Выбранная фигура</strong></div></div>
          {selected && <><div className="selected-token-title"><span className={`initiative-avatar token-${selected.color}`}>{selected.kind === "enemy" ? "!" : "♟"}</span><div><strong>{selected.name}</strong><small>{selected.kind === "enemy" ? "Противник" : "Союзник"}</small></div></div><div className="hp-line"><span>Хиты</span><b>{selected.hp} / {selected.maxHp}</b></div><div className="hp-track"><i style={{ width: `${(selected.hp / selected.maxHp) * 100}%` }}/></div><div className="token-actions"><button disabled={!canEdit} onClick={() => setTokens(items => items.map(t => t.id === selected.id ? { ...t, hp: Math.max(0, t.hp - 1) } : t))}><Minus size={14}/> Урон</button><button disabled={!canEdit} onClick={() => setTokens(items => items.map(t => t.id === selected.id ? { ...t, hp: Math.min(t.maxHp, t.hp + 1) } : t))}><Plus size={14}/> Лечение</button></div></>}
        </section>
        <section className="table-panel dice-panel">
          <div className="table-panel-title"><div><Dice5 size={16}/><strong>Быстрый бросок</strong></div></div>
          <button className="dice-roll-button" onClick={rollD20} disabled={diceBusy}><Dice5 size={19}/> {diceBusy ? "Бросаем…" : "Бросить d20"}</button>
          <small>{remoteEnabled ? "Результат рассчитывается сервером и попадает в журнал этой сцены." : "Локальный демонстрационный бросок. Для серверных бросков потребуется авторизованная сессия."}</small>
        </section>
        <section className="table-panel chat-panel">
          <div className="table-panel-title"><div><Users size={16}/><strong>Журнал событий</strong></div></div>
          <div className="table-log">{log.map(entry => <p key={entry.id} className={`log-${entry.tone}`}>{entry.text}</p>)}</div>
          <form className="table-chat-form" onSubmit={sendMessage}><input value={message} onChange={event => setMessage(event.target.value)} placeholder="Добавить заметку…"/><button aria-label="Добавить заметку" type="submit"><Send size={15}/></button></form>
        </section>
      </aside>
    </div>
  </section>;
}
