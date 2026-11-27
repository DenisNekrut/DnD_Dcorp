import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Crown, RefreshCw, Shield, UserMinus, Users, X } from "lucide-react";
import { apiRequest } from "./api";
import "./styles/campaign-members.css";

type MemberRole = "GAME_MASTER" | "ASSISTANT" | "PLAYER" | "OBSERVER";
type CampaignMember = {
  id: string;
  role: MemberRole;
  status: "APPROVED" | "PENDING" | "REJECTED" | "BLOCKED";
  createdAt: string;
  isOwner?: boolean;
  user: { id: string; username: string };
};

const roleLabels: Record<MemberRole, string> = {
  GAME_MASTER: "Мастер",
  ASSISTANT: "Помощник мастера",
  PLAYER: "Игрок",
  OBSERVER: "Наблюдатель",
};

export default function CampaignMembersPanel({
  campaignId,
  isOwner,
}: {
  campaignId: string;
  isOwner: boolean;
}) {
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [pending, setPending] = useState<CampaignMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [memberRows, pendingRows, invite] = await Promise.all([
        apiRequest<CampaignMember[]>(`/campaigns/${campaignId}/members`),
        apiRequest<CampaignMember[]>(`/campaigns/${campaignId}/requests`),
        apiRequest<{ inviteToken: string }>(`/campaigns/${campaignId}/invite`),
      ]);
      setMembers(Array.isArray(memberRows) ? memberRows : []);
      setPending(Array.isArray(pendingRows) ? pendingRows : []);
      setInviteToken(invite.inviteToken ?? "");
      setInviteCopied(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить состав кампании.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { void load(); }, [load]);

  const inviteUrl = inviteToken
    ? `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(inviteToken)}`
    : "";

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setError("");
    } catch {
      setError("Не удалось скопировать ссылку автоматически. Выдели её и скопируй вручную.");
    }
  };

  const changeRole = async (member: CampaignMember, role: MemberRole) => {
    setBusyId(member.id);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<CampaignMember>(
        `/campaigns/${campaignId}/members/${member.id}/role`,
        { method: "POST", body: JSON.stringify({ role }) },
      );
      setMembers(current => current.map(item => item.id === member.id ? { ...item, role: updated.role } : item));
      setNotice(`Роль участника «${member.user.username}» обновлена.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось изменить роль.");
    } finally {
      setBusyId("");
    }
  };

  const removeMember = async (member: CampaignMember) => {
    if (!window.confirm(`Удалить участника «${member.user.username}» из кампании?`)) return;
    setBusyId(member.id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/campaigns/${campaignId}/members/${member.id}/remove`, { method: "POST" });
      setMembers(current => current.filter(item => item.id !== member.id));
      setNotice(`Участник «${member.user.username}» удалён из кампании.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить участника.");
    } finally {
      setBusyId("");
    }
  };

  const resolveRequest = async (member: CampaignMember, action: "approve" | "reject") => {
    setBusyId(member.id);
    setError("");
    setNotice("");
    try {
      await apiRequest(
        `/campaigns/${campaignId}/requests/${member.id}/${action}`,
        { method: "POST" },
      );
      setPending(current => current.filter(item => item.id !== member.id));
      if (action === "approve") {
        setMembers(current => [...current, { ...member, status: "APPROVED", role: "PLAYER" }]);
        setNotice(`Заявка «${member.user.username}» одобрена.`);
      } else {
        setNotice(`Заявка «${member.user.username}» отклонена.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось обработать заявку.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="campaign-members-panel">
      <div className="campaign-members-summary">
        <div><Users size={18}/><span>Участники</span><strong>{members.length}</strong></div>
        <div><Shield size={18}/><span>Заявки</span><strong>{pending.length}</strong></div>
      </div>

      <div className="campaign-invite-box">
        <div><strong>Ссылка для приглашения</strong><span>Отправь её игрокам. Они смогут подать заявку на вступление.</span></div>
        <div className="campaign-invite-copy-row">
          <input aria-label="Ссылка приглашения" readOnly value={inviteUrl} placeholder="Загружаем ссылку…"/>
          <button type="button" onClick={() => void copyInvite()} disabled={!inviteUrl}><Copy size={15}/>{inviteCopied ? "Скопировано" : "Копировать"}</button>
        </div>
      </div>

      {error && <p className="campaign-members-error" role="alert">{error}</p>}
      {notice && <p className="campaign-members-notice" role="status">{notice}</p>}

      <div className="campaign-members-section">
        <div className="campaign-members-heading">
          <h3>Состав кампании</h3>
          <button type="button" className="campaign-members-refresh" onClick={() => void load()} disabled={loading || Boolean(busyId)} title="Обновить список"><RefreshCw size={15}/></button>
        </div>
        {loading ? <p className="campaign-members-empty">Загружаем участников…</p> : members.length === 0 ? <p className="campaign-members-empty">В кампании пока нет одобренных участников.</p> : (
          <div className="campaign-member-list">
            {members.map(member => (
              <article className="campaign-member-row" key={member.id}>
                <div className="campaign-member-avatar">{member.user.username.slice(0, 1).toUpperCase()}</div>
                <div className="campaign-member-identity">
                  <strong>{member.user.username}</strong>
                  <span>{member.isOwner ? "Владелец кампании" : roleLabels[member.role]}</span>
                </div>
                {!member.isOwner && <label className="campaign-member-role">
                  <span className="sr-only">Роль: {member.user.username}</span>
                  <select
                    value={member.role}
                    disabled={Boolean(busyId) || (member.role === "GAME_MASTER" && !isOwner)}
                    onChange={event => void changeRole(member, event.target.value as MemberRole)}
                  >
                    {(["GAME_MASTER", "ASSISTANT", "PLAYER", "OBSERVER"] as MemberRole[])
                      .filter(role => isOwner || role !== "GAME_MASTER")
                      .map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}
                  </select>
                </label>}
                {!member.isOwner && <button type="button" className="campaign-member-remove" onClick={() => void removeMember(member)} disabled={Boolean(busyId) || (member.role !== "PLAYER" && member.role !== "OBSERVER" && !isOwner)} title="Удалить из кампании" aria-label={`Удалить ${member.user.username}`}>
                  {busyId === member.id ? <RefreshCw size={15}/> : <UserMinus size={15}/>}
                </button>}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="campaign-members-section">
        <div className="campaign-members-heading">
          <h3>Заявки на вступление</h3>
          <span>{pending.length}</span>
        </div>
        {loading ? <p className="campaign-members-empty">Загружаем заявки…</p> : pending.length === 0 ? <p className="campaign-members-empty">Новых заявок нет.</p> : (
          <div className="campaign-member-list">
            {pending.map(member => (
              <article className="campaign-member-row campaign-request-row" key={member.id}>
                <div className="campaign-member-avatar">{member.user.username.slice(0, 1).toUpperCase()}</div>
                <div className="campaign-member-identity"><strong>{member.user.username}</strong><span>Ожидает решения</span></div>
                <div className="campaign-request-actions">
                  <button type="button" onClick={() => void resolveRequest(member, "approve")} disabled={Boolean(busyId)} title="Одобрить" aria-label={`Одобрить ${member.user.username}`}><Check size={16}/></button>
                  <button type="button" onClick={() => void resolveRequest(member, "reject")} disabled={Boolean(busyId)} title="Отклонить" aria-label={`Отклонить ${member.user.username}`}><X size={16}/></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <p className="campaign-members-footnote"><Crown size={13}/> Только владелец кампании может назначать и менять мастеров. Мастер может управлять обычными участниками.</p>
    </div>
  );
}
