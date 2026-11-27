import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";
import { Eye, RefreshCw, Shield, ShieldCheck, Ban, Search, Users, Swords, ClipboardList, ArrowLeft } from "lucide-react";
import "./styles/admin.css";

type AdminUser = { id: string; username: string; email: string; platformRole: string; createdAt: string; bannedAt: string | null; bannedUntil: string | null; banReason: string | null };
type AdminCampaign = { id: string; name: string; description: string | null; createdAt: string; updatedAt: string; applicationsOpen: boolean; owner: { id: string; username: string; email: string }; _count: { memberships: number } };
type AuditItem = { id: string; action: string; reason: string | null; createdAt: string; actor: { username: string }; targetUser: { username: string; email: string } | null };
type Overview = { users: number; campaigns: number; bannedUsers: number; pendingMemberships: number };
type Observation = { id: string; name: string; description: string | null; owner: { username: string; email: string }; memberships: Array<{ id: string; role: string; status: string; user: { id: string; username: string; email: string; bannedAt: string | null; bannedUntil: string | null } }>; tableState: unknown; observationOnly: boolean };
type Tab = "users" | "campaigns" | "audit";

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>("users");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [banTarget, setBanTarget] = useState("");
  const [banReason, setBanReason] = useState("");
  const [duration, setDuration] = useState("24");
  const [observation, setObservation] = useState<Observation | null>(null);
  const [observeLoading, setObserveLoading] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [summary, userRows, campaignRows, auditRows] = await Promise.all([
        apiRequest<Overview>("/admin/overview"),
        apiRequest<AdminUser[]>("/admin/users"),
        apiRequest<AdminCampaign[]>("/admin/campaigns"),
        apiRequest<AuditItem[]>("/admin/audit"),
      ]);
      setOverview(summary); setUsers(userRows); setCampaigns(campaignRows); setAudit(auditRows);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить данные администрирования."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? users.filter(user => user.username.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)) : users;
  }, [users, search]);

  const submitBan = async (userId: string) => {
    if (banReason.trim().length < 5) { setError("Укажи причину блокировки (не менее 5 символов)."); return; }
    setBusyId(userId); setError("");
    try {
      await apiRequest(`/admin/users/${userId}/ban`, { method: "POST", body: JSON.stringify({ reason: banReason.trim(), ...(duration === "permanent" ? {} : { durationHours: Number(duration) }) }) });
      setBanTarget(""); setBanReason(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось заблокировать пользователя."); }
    finally { setBusyId(""); }
  };

  const unban = async (userId: string) => {
    setBusyId(userId); setError("");
    try { await apiRequest(`/admin/users/${userId}/unban`, { method: "POST" }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось снять блокировку."); }
    finally { setBusyId(""); }
  };

  const observe = async (campaignId: string) => {
    setObserveLoading(true); setError("");
    try { setObservation(await apiRequest<Observation>(`/admin/campaigns/${campaignId}/observe`)); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось открыть сессию для наблюдения."); }
    finally { setObserveLoading(false); }
  };

  const state = observation?.tableState && typeof observation.tableState === "object" ? observation.tableState as Record<string, unknown> : {};
  const tokens = Array.isArray(state.tokens) ? state.tokens as Array<Record<string, unknown>> : [];
  const log = Array.isArray(state.log) ? state.log as Array<Record<string, unknown> | string> : [];
  const round = Number(state.round ?? 1);

  return <section className="page-section admin-page">
    <div className="page-heading"><div><div className="eyebrow"><span/> ЦЕНТР БЕЗОПАСНОСТИ</div><h1>Администрирование</h1><p className="subtitle">Управление пользователями, наблюдение за сессиями и история модерации.</p></div><button className="button button-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Обновить</button></div>
    {error && <p className="validation-note" role="alert">{error}</p>}
    {overview && <div className="admin-stats"><article><Users/><strong>{overview.users}</strong><span>Аккаунтов</span></article><article><Swords/><strong>{overview.campaigns}</strong><span>Кампаний</span></article><article><Ban/><strong>{overview.bannedUsers}</strong><span>Активных блокировок</span></article><article><ClipboardList/><strong>{overview.pendingMemberships}</strong><span>Заявок на вступление</span></article></div>}
    {observation ? <div className="admin-observation">
      <div className="admin-observation-head"><button className="button button-secondary" onClick={() => setObservation(null)}><ArrowLeft size={16}/> К списку кампаний</button><span className="admin-readonly"><Eye size={14}/> Только наблюдение</span></div>
      <h2>{observation.name}</h2><p className="admin-muted">Мастер: {observation.owner.username} · {observation.owner.email}</p>
      <div className="admin-observation-grid"><article className="admin-subpanel"><h3>Участники · {observation.memberships.length}</h3>{observation.memberships.map(member=><div className="admin-member" key={member.id}><div><strong>{member.user.username}</strong><small>{member.user.email}</small></div><span>{member.role} · {member.status}</span>{member.user.bannedAt&&<em>Заблокирован</em>}</div>)}</article>
      <article className="admin-subpanel"><h3>Состояние игрового стола</h3><div className="admin-round">Раунд {round} · {tokens.length} фигур</div>{tokens.length===0?<p className="admin-muted">На сервере пока нет сохранённых фигур. Данные локального прототипа не отображаются как реальная сессия.</p>:<div className="admin-token-list">{tokens.map((token,index)=><div key={String(token.id??index)}><strong>{String(token.name??"Фигура")}</strong><span>{String(token.kind??"")} · Хиты: {String(token.hp??"—")} / {String(token.maxHp??"—")}</span><small>Позиция: {String(token.x??"—")}, {String(token.y??"—")}</small></div>)}</div>}</article></div>
      <article className="admin-subpanel admin-log"><h3>Журнал событий</h3>{log.length===0?<p className="admin-muted">Сохранённый журнал пока пуст.</p>:log.slice(-30).map((entry,index)=><p key={index}>{typeof entry==="string"?entry:String(entry.text??JSON.stringify(entry))}</p>)}</article>
      <p className="admin-footnote">Показан последний сохранённый сервером снимок. Обновление в реальном времени появится после подключения live-синхронизации игрового стола.</p>
    </div> : <>
      <div className="admin-tabs"><button className={tab==="users"?"active":""} onClick={()=>setTab("users")}><Users size={16}/> Пользователи</button><button className={tab==="campaigns"?"active":""} onClick={()=>setTab("campaigns")}><Swords size={16}/> Сессии и кампании</button><button className={tab==="audit"?"active":""} onClick={()=>setTab("audit")}><ClipboardList size={16}/> Журнал действий</button></div>
      {tab==="users"&&<article className="admin-table-panel"><div className="admin-toolbar"><div className="search-field"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по имени или почте"/></div><span>{filteredUsers.length} пользователей</span></div>{loading?<p className="admin-muted">Загрузка…</p>:filteredUsers.map(user=><div className="admin-user-row" key={user.id}><div className="admin-user-main"><div className="admin-user-avatar">{user.username.slice(0,1).toUpperCase()}</div><div><strong>{user.username}</strong><small>{user.email}</small><small>Регистрация: {new Date(user.createdAt).toLocaleDateString()}</small></div></div><div className="admin-user-status">{user.platformRole==="ADMIN"?<span className="admin-role"><ShieldCheck size={14}/> Администратор</span>:user.bannedAt&&(!user.bannedUntil||new Date(user.bannedUntil)>new Date())?<span className="admin-banned">Заблокирован{user.bannedUntil? ` до ${new Date(user.bannedUntil).toLocaleString()}` : " навсегда"}</span>:<span className="admin-normal">Активен</span>}</div><div className="admin-user-actions">{user.platformRole!=="ADMIN"&&(user.bannedAt&&(!user.bannedUntil||new Date(user.bannedUntil)>new Date())?<button className="button button-secondary" disabled={busyId===user.id} onClick={()=>void unban(user.id)}><ShieldCheck size={15}/> Разблокировать</button>:<button className="button button-danger" disabled={busyId===user.id} onClick={()=>{setBanTarget(banTarget===user.id?"":user.id);setBanReason("");}}><Ban size={15}/> Заблокировать</button>)}</div>{banTarget===user.id&&<div className="admin-ban-form"><label>Причина<textarea value={banReason} onChange={e=>setBanReason(e.target.value)} placeholder="Например: оскорбления и агрессивное поведение"/></label><label>Срок<select value={duration} onChange={e=>setDuration(e.target.value)}><option value="24">24 часа</option><option value="168">7 дней</option><option value="720">30 дней</option><option value="permanent">Бессрочно</option></select></label><div><button className="button button-secondary" onClick={()=>setBanTarget("")}>Отмена</button><button className="button button-danger" disabled={busyId===user.id} onClick={()=>void submitBan(user.id)}>Подтвердить блокировку</button></div></div>}</div>)}</article>}
      {tab==="campaigns"&&<div className="admin-campaign-list">{loading?<p className="admin-muted">Загрузка…</p>:campaigns.map(campaign=><article className="admin-campaign-row" key={campaign.id}><div className="admin-campaign-symbol"><Swords/></div><div className="admin-campaign-info"><strong>{campaign.name}</strong><span>Мастер: {campaign.owner.username} · {campaign.owner.email}</span><small>{campaign._count.memberships} одобренных участников · {campaign.applicationsOpen?"Приём заявок открыт":"Приём заявок закрыт"}</small></div><button className="button button-secondary" onClick={()=>void observe(campaign.id)} disabled={observeLoading}><Eye size={15}/> Наблюдать</button></article>)}</div>}
      {tab==="audit"&&<article className="admin-table-panel">{loading?<p className="admin-muted">Загрузка…</p>:audit.length===0?<p className="admin-muted">Модераторских действий пока нет.</p>:audit.map(item=><div className="admin-audit-row" key={item.id}><strong>{item.action==="USER_BANNED"?"Блокировка пользователя":item.action==="USER_UNBANNED"?"Снятие блокировки":item.action}</strong><span>{item.targetUser?item.targetUser.username+" · "+item.targetUser.email:"—"}</span><small>Администратор: {item.actor.username} · {new Date(item.createdAt).toLocaleString()}</small>{item.reason&&<p>{item.reason}</p>}</div>)}</article>}
    </>}
    {observeLoading&&<p className="admin-muted">Открываем сессию в режиме наблюдения…</p>}
    <div className="admin-safety-note"><Shield size={17}/><span>Действия администратора фиксируются в журнале. Блокировка запрещает пользователю пользоваться защищёнными разделами портала; администраторы не могут блокировать другие администраторские аккаунты.</span></div>
  </section>;
}
