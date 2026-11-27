import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Dice5, Eye, Grid3X3, Minus, Plus, Send, Shield, Swords, Users, ZoomIn, ZoomOut } from "lucide-react";
import "./tabletop.css";

type Token = { id: string; name: string; kind: "hero" | "enemy" | "ally"; x: number; y: number; hp: number; maxHp: number; color: string; initiative: number };
type LogEntry = { id: number; text: string; tone: "gold" | "muted" | "danger" };

const initialTokens: Token[] = [
  { id: "hero", name: "Искатель", kind: "hero", x: 25, y: 38, hp: 12, maxHp: 12, color: "gold", initiative: 16 },
  { id: "ally", name: "Спутник", kind: "ally", x: 39, y: 57, hp: 9, maxHp: 9, color: "blue", initiative: 12 },
  { id: "enemy-a", name: "Гоблин", kind: "enemy", x: 68, y: 37, hp: 7, maxHp: 7, color: "red", initiative: 14 },
  { id: "enemy-b", name: "Гоблин", kind: "enemy", x: 77, y: 59, hp: 7, maxHp: 7, color: "red", initiative: 9 },
];

export default function GameTable({ campaignName, onBack }: { campaignName: string; onBack: () => void }) {
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
  const initiative = useMemo(() => [...tokens].sort((a, b) => b.initiative - a.initiative), [tokens]);
  const activeToken = initiative[turn % Math.max(initiative.length, 1)];
  const selected = tokens.find(token => token.id === selectedId) ?? tokens[0];

  const addLog = (text: string, tone: LogEntry["tone"] = "muted") => {
    setLog(items => [...items.slice(-19), { id: Date.now() + Math.random(), text, tone }]);
  };
  const rollD20 = () => {
    const value = Math.floor(Math.random() * 20) + 1;
    addLog(`Искатель бросает d20: ${value}.`, value === 20 ? "gold" : "muted");
  };
  const nextTurn = () => {
    if (turn + 1 >= initiative.length) {
      setTurn(0);
      setRound(value => value + 1);
      addLog(`Начался раунд ${round + 1}.`, "gold");
    } else {
      setTurn(value => value + 1);
    }
  };
  const moveToken = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(4, Math.min(96, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((event.clientY - rect.top) / rect.height) * 100));
    setTokens(items => items.map(token => token.id === draggingId ? { ...token, x, y } : token));
  };
  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    addLog(`Вы: ${message.trim()}`);
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
      <div className="tabletop-status"><span className="live-dot"/> Сцена активна <small>Локальный прототип</small></div>
    </div>

    <div className="tabletop-layout">
      <div className="tabletop-center">
        <div className="table-toolbar">
          <div className="table-tool-group">
            <button title="Показать или скрыть сетку" className={showGrid ? "tool-active" : ""} onClick={() => setShowGrid(value => !value)}><Grid3X3 size={17}/></button>
            <button title="Уменьшить" onClick={() => setZoom(value => Math.max(60, value - 10))}><ZoomOut size={17}/></button>
            <span>{zoom}%</span>
            <button title="Увеличить" onClick={() => setZoom(value => Math.min(150, value + 10))}><ZoomIn size={17}/></button>
          </div>
          <div className="table-tool-group"><span className="scene-label"><Eye size={14}/> Вид мастера</span></div>
        </div>

        <div className={`battle-map ${showGrid ? "with-grid" : ""}`} onPointerMove={moveToken} onPointerUp={() => setDraggingId(null)} onPointerLeave={() => setDraggingId(null)}>
          <div className="map-scale" style={{ transform: `scale(${zoom / 100})` }}>
            <div className="map-decoration map-stone-one"/><div className="map-decoration map-stone-two"/>
            <div className="map-ruin ruin-a"/><div className="map-ruin ruin-b"/><div className="map-water"/>
            {tokens.map(token => <button key={token.id} className={`map-token token-${token.color} ${selectedId === token.id ? "token-selected" : ""} ${activeToken?.id === token.id ? "token-active" : ""}`} style={{ left: `${token.x}%`, top: `${token.y}%` }} onPointerDown={event => { event.preventDefault(); setSelectedId(token.id); setDraggingId(token.id); event.currentTarget.setPointerCapture(event.pointerId); }} onClick={() => setSelectedId(token.id)} title={token.name}>
              <span className="token-glyph">{token.kind === "enemy" ? "!" : token.kind === "ally" ? "✦" : "♟"}</span><span className="token-label">{token.name}</span><span className="token-health"><i style={{ width: `${(token.hp / token.maxHp) * 100}%` }}/></span>
            </button>)}
          </div>
          <div className="map-coordinates"><span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span><span>G</span><span>H</span></div>
        </div>
        <div className="map-caption"><span><i className="legend-dot hero-dot"/> Союзники</span><span><i className="legend-dot enemy-dot"/> Противники</span><span>Перетаскивай фигуры мышью</span></div>
      </div>

      <aside className="table-sidebar">
        <section className="table-panel">
          <div className="table-panel-title"><div><Swords size={16}/><strong>Инициатива</strong></div><span>Раунд {round}</span></div>
          <div className="initiative-list">{initiative.map((token, index) => <button key={token.id} className={`initiative-row ${activeToken?.id === token.id ? "initiative-current" : ""} ${selectedId === token.id ? "initiative-selected" : ""}`} onClick={() => setSelectedId(token.id)}><span className={`initiative-avatar token-${token.color}`}>{token.kind === "enemy" ? "!" : "♟"}</span><span className="initiative-name">{token.name}<small>{token.kind === "enemy" ? "Противник" : "Участник"}</small></span><b>{token.initiative}</b>{activeToken?.id === token.id && <i className="turn-indicator"/>}</button>)}</div>
          <button className="button button-primary full-width next-turn" onClick={nextTurn}>Следующий ход <ChevronRight size={16}/></button>
        </section>

        <section className="table-panel selected-panel">
          <div className="table-panel-title"><div><Shield size={16}/><strong>Выбранная фигура</strong></div></div>
          {selected && <><div className="selected-token-title"><span className={`initiative-avatar token-${selected.color}`}>{selected.kind === "enemy" ? "!" : "♟"}</span><div><strong>{selected.name}</strong><small>{selected.kind === "enemy" ? "Противник" : "Союзник"}</small></div></div><div className="hp-line"><span>Хиты</span><b>{selected.hp} / {selected.maxHp}</b></div><div className="hp-track"><i style={{ width: `${(selected.hp / selected.maxHp) * 100}%` }}/></div><div className="token-actions"><button onClick={() => setTokens(items => items.map(t => t.id === selected.id ? { ...t, hp: Math.max(0, t.hp - 1) } : t))}><Minus size={14}/> Урон</button><button onClick={() => setTokens(items => items.map(t => t.id === selected.id ? { ...t, hp: Math.min(t.maxHp, t.hp + 1) } : t))}><Plus size={14}/> Лечение</button></div></>}
        </section>

        <section className="table-panel dice-panel">
          <div className="table-panel-title"><div><Dice5 size={16}/><strong>Быстрый бросок</strong></div></div>
          <button className="dice-roll-button" onClick={rollD20}><Dice5 size={19}/> Бросить d20</button>
          <small>Пока демонстрационный бросок в интерфейсе. Серверный кубик уже подготовлен в API и будет подключён при интеграции сессий.</small>
        </section>

        <section className="table-panel chat-panel">
          <div className="table-panel-title"><div><Users size={16}/><strong>Журнал событий</strong></div></div>
          <div className="table-log">{log.map(entry => <p key={entry.id} className={`log-${entry.tone}`}>{entry.text}</p>)}</div>
          <form className="table-chat-form" onSubmit={sendMessage}><input value={message} onChange={event => setMessage(event.target.value)} placeholder="Добавить заметку..."/><button aria-label="Отправить" type="submit"><Send size={15}/></button></form>
        </section>
      </aside>
    </div>
  </section>;
}
