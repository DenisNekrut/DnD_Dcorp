import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Dice5, Eye, Grid3X3, Plus, Send, Shield, Swords, Users, ZoomIn, ZoomOut, Settings2, Map, UserPlus, Magnet, Undo2, Redo2, ImagePlus, Trash2 } from "lucide-react";
import { apiRequest, isApiConfigured } from "./api";
import RoomMapEditor, { type MapObject, type LayerVisibility, type LayerLocks, defaultLayerVisibility, defaultLayerLocks } from "./RoomMapEditor";
import "./styles/tabletop.css";
import "./styles/tabletop-room.css";
import "./styles/tabletop-map-editor.css";
import "./styles/tabletop-publication.css";
import "./styles/tabletop-layers.css";

type ConditionId = "blinded" | "charmed" | "deafened" | "frightened" | "grappled" | "incapacitated" | "invisible" | "paralyzed" | "petrified" | "poisoned" | "prone" | "restrained" | "stunned" | "unconscious";
type RollKind = "attack" | "ability" | "skill" | "save";
type RollMode = "normal" | "advantage" | "disadvantage";
type RollModeOverride = "auto" | RollMode;
type AbilityId = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
const abilityLabels: Record<AbilityId, string> = { strength: "Сила", dexterity: "Ловкость", constitution: "Телосложение", intelligence: "Интеллект", wisdom: "Мудрость", charisma: "Харизма" };
type SkillId = "acrobatics" | "animalHandling" | "arcana" | "athletics" | "deception" | "history" | "insight" | "intimidation" | "investigation" | "medicine" | "nature" | "perception" | "performance" | "persuasion" | "religion" | "sleightOfHand" | "stealth" | "survival";
type DamageType = "acid" | "bludgeoning" | "cold" | "fire" | "force" | "lightning" | "necrotic" | "piercing" | "poison" | "psychic" | "radiant" | "slashing" | "thunder";
type WeaponOption = { id: string; name: string; category: "simple" | "martial"; kind: "melee" | "ranged"; damage: string | null; damageType: DamageType | null; properties: string[]; versatileDamage?: string; rangeFt?: { normal: number; long: number } };
const fallbackWeapons: WeaponOption[] = [
  { id: "dagger", name: "Кинжал", category: "simple", kind: "melee", damage: "1d4", damageType: "piercing", properties: ["finesse", "light", "thrown"], rangeFt: { normal: 20, long: 60 } },
  { id: "longsword", name: "Длинный меч", category: "martial", kind: "melee", damage: "1d8", damageType: "slashing", properties: ["versatile"], versatileDamage: "1d10" },
  { id: "shortbow", name: "Короткий лук", category: "simple", kind: "ranged", damage: "1d6", damageType: "piercing", properties: ["ammunition", "two-handed"], rangeFt: { normal: 80, long: 320 } },
  { id: "greatsword", name: "Двуручный меч", category: "martial", kind: "melee", damage: "2d6", damageType: "slashing", properties: ["heavy", "two-handed"] },
];
const damageTypeOptions: { id: DamageType; label: string }[] = [
  { id: "acid", label: "Кислота" }, { id: "bludgeoning", label: "Дробящий" }, { id: "cold", label: "Холод" },
  { id: "fire", label: "Огонь" }, { id: "force", label: "Силовое поле" }, { id: "lightning", label: "Электричество" },
  { id: "necrotic", label: "Некротический" }, { id: "piercing", label: "Колющий" }, { id: "poison", label: "Яд" },
  { id: "psychic", label: "Психический" }, { id: "radiant", label: "Излучение" }, { id: "slashing", label: "Рубящий" },
  { id: "thunder", label: "Звук" },
];
const skillLabels: { id: SkillId; label: string; ability: AbilityId }[] = [
  { id: "acrobatics", label: "Акробатика", ability: "dexterity" }, { id: "animalHandling", label: "Уход за животными", ability: "wisdom" },
  { id: "arcana", label: "Магия", ability: "intelligence" }, { id: "athletics", label: "Атлетика", ability: "strength" },
  { id: "deception", label: "Обман", ability: "charisma" }, { id: "history", label: "История", ability: "intelligence" },
  { id: "insight", label: "Проницательность", ability: "wisdom" }, { id: "intimidation", label: "Запугивание", ability: "charisma" },
  { id: "investigation", label: "Расследование", ability: "intelligence" }, { id: "medicine", label: "Медицина", ability: "wisdom" },
  { id: "nature", label: "Природа", ability: "intelligence" }, { id: "perception", label: "Внимательность", ability: "wisdom" },
  { id: "performance", label: "Выступление", ability: "charisma" }, { id: "persuasion", label: "Убеждение", ability: "charisma" },
  { id: "religion", label: "Религия", ability: "intelligence" }, { id: "sleightOfHand", label: "Ловкость рук", ability: "dexterity" },
  { id: "stealth", label: "Скрытность", ability: "dexterity" }, { id: "survival", label: "Выживание", ability: "wisdom" },
];
const parseDamageFormula = (formula: string) => {
  const normalized = formula.trim().replace(/\s+/g, "");
  if (/^\d{1,3}$/.test(normalized)) return { count: 0, sides: 0, modifier: 0, flatDamage: Number(normalized) };
  const match = normalized.match(/^(\d{1,2})d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/i);
  if (!match) return null;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(match[3]) : 0;
  if (count < 1 || count > 10 || modifier < -100 || modifier > 100) return null;
  return { count, sides, modifier, flatDamage: undefined as number | undefined };
};

const getAutoRollFlags = (token: Token, kind: RollKind, saveAbility: AbilityId) => {
  const conditions = new Set(token.conditions ?? []);
  const advantage = kind === "attack" && conditions.has("invisible");
  const disadvantage = kind === "attack"
    ? ["blinded", "poisoned", "prone", "restrained", "frightened"].some(condition => conditions.has(condition as ConditionId)) || (token.exhaustionLevel ?? 0) >= 3
    : kind === "ability" || kind === "skill"
      ? conditions.has("poisoned") || conditions.has("frightened") || (token.exhaustionLevel ?? 0) >= 1
      : (token.exhaustionLevel ?? 0) >= 3 || (conditions.has("restrained") && saveAbility === "dexterity");
  return { advantage, disadvantage };
};

const getTargetAttackFlags = (target: Token, attackType: "melee" | "ranged") => {
  const conditions = new Set(target.conditions ?? []);
  return {
    advantage: ["blinded", "restrained", "paralyzed", "petrified", "stunned", "unconscious"].some(condition => conditions.has(condition as ConditionId)) || (conditions.has("prone") && attackType === "melee"),
    disadvantage: conditions.has("invisible") || (conditions.has("prone") && attackType === "ranged"),
  };
};

const resolveRollMode = (flags: { advantage: boolean; disadvantage: boolean }): RollMode => {
  if (flags.advantage && flags.disadvantage) return "normal";
  if (flags.advantage) return "advantage";
  if (flags.disadvantage) return "disadvantage";
  return "normal";
};
type Token = { id: string; name: string; kind: "hero" | "enemy" | "ally"; x: number; y: number; hp: number; maxHp: number; color: string; initiative: number; armorClass?: number; proficiencyBonus?: number; abilityModifiers?: Partial<Record<AbilityId, number>>; weaponProficiencies?: string[]; temporaryHp?: number; deathSaves?: { successes: number; failures: number }; damageResistances?: DamageType[]; damageVulnerabilities?: DamageType[]; damageImmunities?: DamageType[]; conditions?: ConditionId[]; exhaustionLevel?: number; skillModifiers?: Partial<Record<SkillId, number>> };
const conditionCatalog: { id: ConditionId; label: string; description: string }[] = [
  { id: "blinded", label: "Ослеплён", description: "Не видит; зрительные проверки и атаки ограничены." },
  { id: "charmed", label: "Очарован", description: "Не может вредить источнику очарования." },
  { id: "deafened", label: "Оглох", description: "Не слышит; проверки слуха невозможны." },
  { id: "frightened", label: "Испуган", description: "Боится источника и не желает приближаться к нему." },
  { id: "grappled", label: "Схвачен", description: "Скорость равна 0." },
  { id: "incapacitated", label: "Недееспособен", description: "Не может совершать действия и реакции." },
  { id: "invisible", label: "Невидим", description: "Не виден обычным зрением." },
  { id: "paralyzed", label: "Парализован", description: "Не может двигаться или действовать." },
  { id: "petrified", label: "Окаменел", description: "Окаменевшее существо не может действовать." },
  { id: "poisoned", label: "Отравлен", description: "Помеха атакам и проверкам характеристик." },
  { id: "prone", label: "Сбит с ног", description: "Лежит; чтобы встать, тратит часть перемещения." },
  { id: "restrained", label: "Опутан", description: "Скорость 0; атаки и проверки Ловкости ограничены." },
  { id: "stunned", label: "Ошеломлён", description: "Не может двигаться и совершать действия." },
  { id: "unconscious", label: "Без сознания", description: "Не действует и находится ничком." },
];
const exhaustionOptions = [
  "0 — нет", "1 — помеха проверкам характеристик", "2 — скорость вдвое меньше",
  "3 — помеха атакам и спасброскам", "4 — максимум хитов вдвое меньше",
  "5 — скорость равна 0", "6 — смерть",
];
type LogEntry = { id: number; text: string; tone: "gold" | "muted" | "danger" };
type RoomSettings = { configured: boolean; published: boolean; name: string; description: string; mapTheme: "sand" | "stone" | "forest"; grid: boolean; snapToGrid: boolean; gridCellSizePx?: number };
type MapAsset = { key: string; url: string; contentType: string; size: number };
type MapView = { scale: number; x: number; y: number };
type TableState = { room: RoomSettings; tokens: Token[]; objects?: MapObject[]; layerVisibility?: LayerVisibility; layerLocks?: LayerLocks; mapAsset?: MapAsset | null; mapView?: MapView; round: number; activeTokenId?: string | null; log: LogEntry[] };
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
  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);
  const [conditionToAdd, setConditionToAdd] = useState<ConditionId>("blinded");
  const [rollKind, setRollKind] = useState<RollKind>("attack");
  const [rollModifier, setRollModifier] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState<SkillId>("acrobatics");
  const [attackAbility, setAttackAbility] = useState<AbilityId>("strength");
  const [useWeaponProficiency, setUseWeaponProficiency] = useState(false);
  const [saveAbility, setSaveAbility] = useState<AbilityId>("strength");
  const [rollModeOverride, setRollModeOverride] = useState<RollModeOverride>("auto");
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
  const [newTokenAc, setNewTokenAc] = useState(10);
  const [newTokenInitiative, setNewTokenInitiative] = useState(10);
  const [hpAdjustment, setHpAdjustment] = useState(1);
  const [temporaryHpInput, setTemporaryHpInput] = useState(1);
  const [attackTargetId, setAttackTargetId] = useState("");
  const [damageFormula, setDamageFormula] = useState("1d6+0");
  const [damageType, setDamageType] = useState<DamageType>("slashing");
  const [weaponOptions, setWeaponOptions] = useState<WeaponOption[]>(fallbackWeapons);
  const [selectedWeaponId, setSelectedWeaponId] = useState("dagger");
  const [useVersatileDamage, setUseVersatileDamage] = useState(false);
  const [attackType, setAttackType] = useState<"melee" | "ranged">("melee");
  const dirtyRef = useRef(false);
  const updatedAtRef = useRef<string | null>(null);
  const initiative = useMemo(() => [...tokens].sort((a, b) => b.initiative - a.initiative), [tokens]);
  const activeToken = initiative.find(token => token.id === activeTokenId) ?? initiative[0];
  const selected = tokens.find(token => token.id === selectedId);
  const attackTargets = selected ? tokens.filter(token => token.id !== selected.id) : [];
  const attackTarget = attackTargets.find(token => token.id === attackTargetId) ?? attackTargets[0];
  const selectedWeapon = weaponOptions.find(weapon => weapon.id === selectedWeaponId) ?? weaponOptions[0];
  const availableConditions = selected ? conditionCatalog.filter(condition => !(selected.conditions ?? []).includes(condition.id)) : conditionCatalog;
  const activeConditionToAdd = availableConditions.some(condition => condition.id === conditionToAdd) ? conditionToAdd : availableConditions[0]?.id ?? conditionToAdd;
  const attackerRollFlags = selected ? getAutoRollFlags(selected, rollKind, saveAbility) : { advantage: false, disadvantage: false };
  const targetRollFlags = rollKind === "attack" && attackTarget ? getTargetAttackFlags(attackTarget, attackType) : { advantage: false, disadvantage: false };
  const selectedRollMode = selected
    ? rollModeOverride === "auto"
      ? resolveRollMode({ advantage: attackerRollFlags.advantage || targetRollFlags.advantage, disadvantage: attackerRollFlags.disadvantage || targetRollFlags.disadvantage })
      : rollModeOverride
    : "normal";
  const selectedSkillData = skillLabels.find(skill => skill.id === selectedSkill) ?? skillLabels[0];
  const effectiveRollModifier = rollKind === "skill"
    ? selected?.skillModifiers?.[selectedSkill] ?? 0
    : rollKind === "attack"
      ? (selected?.abilityModifiers?.[attackAbility] ?? 0) + (useWeaponProficiency ? selected?.proficiencyBonus ?? 0 : 0) + rollModifier
      : rollModifier;
  const selectedBlockedCondition = selected?.conditions?.find(condition => ["incapacitated", "paralyzed", "petrified", "stunned", "unconscious"].includes(condition));
  const selectedRollBlocked = Boolean(selected && ((selected.exhaustionLevel ?? 0) >= 6 || (rollKind === "attack" && selectedBlockedCondition)));
  const selectedAutoFailCondition = selected?.conditions?.find(condition => ["paralyzed", "stunned", "unconscious"].includes(condition));
  const selectedSaveAutoFail = Boolean(selected && rollKind === "save" && (saveAbility === "strength" || saveAbility === "dexterity") && selectedAutoFailCondition);
  const selectedRollModeLabel = selectedRollMode === "advantage" ? "Преимущество" : selectedRollMode === "disadvantage" ? "Помеха" : "Обычный бросок";
  const selectedRollBlockReason = (selected?.exhaustionLevel ?? 0) >= 6 ? "Истощение 6: персонаж мёртв." : selectedBlockedCondition ? `Состояние «${conditionCatalog.find(item => item.id === selectedBlockedCondition)?.label ?? selectedBlockedCondition}» не позволяет атаковать.` : "";
  const selectedSaveFailReason = selectedAutoFailCondition ? `Состояние «${conditionCatalog.find(item => item.id === selectedAutoFailCondition)?.label ?? selectedAutoFailCondition}» автоматически проваливает спасброски Силы и Ловкости.` : "";
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
  const updateMapView = (patch: Partial<MapView>) => { if (layerLocks.background) return; recordEditorHistory(); setMapView(value => ({ ...value, ...patch })); };
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
      setActiveTokenId(null);
      setLog([]);
    }
    if (typeof state.round === "number") setRound(state.round);
    setActiveTokenId(state.activeTokenId ?? null);
    if (typeof response.permissions?.canEdit === "boolean") setCanEdit(response.permissions.canEdit);
    updatedAtRef.current = response.updatedAt;
    setLastUpdated(response.updatedAt ? new Date(response.updatedAt).toLocaleTimeString() : "");
  };

  useEffect(() => {
    if (!remoteEnabled) return;
    let active = true;
    apiRequest<WeaponOption[]>("/rules/weapons")
      .then(items => { if (active && Array.isArray(items)) setWeaponOptions(items.filter(item => item.damage && item.damageType)); })
      .catch(error => { if (active) setTableError(error instanceof Error ? error.message : "Не удалось загрузить каталог оружия."); });
    return () => { active = false; };
  }, [remoteEnabled]);

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
    const state: TableState = { room, tokens, objects, layerVisibility, layerLocks, mapAsset, mapView, round, activeTokenId, log };
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
  }, [room, tokens, objects, layerVisibility, layerLocks, mapAsset, mapView, round, activeTokenId, log, campaignId, remoteEnabled, tableLoaded, canEdit]);

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
    const rawAbilityModifiers = (data.abilityModifiers ?? {}) as Record<string, number>;
    const token: Token = { id: newId(), name: character.name, kind: "hero", x: 50, y: 50, hp: Number(hp), maxHp: Number(hp), color: "gold", initiative: initiativeValue, armorClass: Number(data.armorClass ?? 10), proficiencyBonus: Number(data.proficiencyBonus ?? 0), abilityModifiers: { strength: Number(rawAbilityModifiers.str ?? rawAbilityModifiers.strength ?? 0), dexterity: Number(rawAbilityModifiers.dex ?? rawAbilityModifiers.dexterity ?? 0), constitution: Number(rawAbilityModifiers.con ?? rawAbilityModifiers.constitution ?? 0), intelligence: Number(rawAbilityModifiers.int ?? rawAbilityModifiers.intelligence ?? 0), wisdom: Number(rawAbilityModifiers.wis ?? rawAbilityModifiers.wisdom ?? 0), charisma: Number(rawAbilityModifiers.cha ?? rawAbilityModifiers.charisma ?? 0) }, weaponProficiencies: ((data.proficiencies as { weapons?: string[] } | undefined)?.weapons ?? []), temporaryHp: Number((data.hitPoints as { temporary?: number } | undefined)?.temporary ?? 0), deathSaves: data.deathSaves as { successes: number; failures: number } | undefined, damageResistances: data.damageResistances as DamageType[] | undefined, damageVulnerabilities: data.damageVulnerabilities as DamageType[] | undefined, damageImmunities: data.damageImmunities as DamageType[] | undefined, skillModifiers: data.skillModifiers as Partial<Record<SkillId, number>> | undefined };
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
    if (!remoteEnabled || !campaignId || !canEdit || layerLocks.background) {
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
    if (!mapAsset || !campaignId || !remoteEnabled || !canEdit || layerLocks.background) return;
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
    const token: Token = { id: newId(), name: newTokenName.trim(), kind: newTokenKind, x: 25 + Math.random() * 50, y: 25 + Math.random() * 50, hp: newTokenHp, maxHp: newTokenHp, color, initiative: newTokenInitiative, armorClass: newTokenAc };
    recordEditorHistory();
    setTokens(items => [...items, token]);
    setSelectedId(token.id);
    addLog(`На карту добавлен участник: ${token.name}.`);
    setNewTokenName("");
  };
  const selectWeapon = (weaponId: string) => {
    const weapon = weaponOptions.find(item => item.id === weaponId);
    if (!weapon) return;
    setSelectedWeaponId(weaponId);
    setUseVersatileDamage(false);
    setDamageFormula(weapon.damage ?? "1d4");
    if (weapon.damageType) setDamageType(weapon.damageType);
    setAttackType(weapon.kind);
    if (weapon.kind === "ranged") setAttackAbility("dexterity");
    else if (!weapon.properties.includes("finesse")) setAttackAbility("strength");
    const proficiencies = selected?.weaponProficiencies ?? [];
    const proficient = proficiencies.some(value => value === weapon.category || value === weapon.id || value === "all" || value === weapon.category + " weapons" || value === (weapon.category === "simple" ? "простое оружие" : "воинское оружие"));
    setUseWeaponProficiency(proficient);
  };

  const toggleVersatileDamage = (enabled: boolean) => {
    setUseVersatileDamage(enabled);
    if (selectedWeapon?.versatileDamage) setDamageFormula(enabled ? selectedWeapon.versatileDamage : selectedWeapon.damage ?? "1d4");
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
  const adjustDamageForTraits = (token: Token, amount: number, type: DamageType) => {
    const resistant = (token.damageResistances ?? []).includes(type);
    const vulnerable = (token.damageVulnerabilities ?? []).includes(type);
    const immune = (token.damageImmunities ?? []).includes(type);
    if (immune) return { amount: 0, note: "иммунитет" };
    if (resistant && vulnerable) return { amount, note: "сопротивление и уязвимость взаимно отменяются" };
    if (resistant) return { amount: Math.floor(amount / 2), note: "сопротивление: половина урона" };
    if (vulnerable) return { amount: amount * 2, note: "уязвимость: двойной урон" };
    return { amount, note: "" };
  };

  const applyDamageToToken = (token: Token, amount: number, critical = false): Token => {
    const damage = Math.max(0, Math.floor(amount));
    if (damage === 0) return token;
    const temporaryHp = Math.max(0, token.temporaryHp ?? 0);
    const absorbed = Math.min(temporaryHp, damage);
    const remaining = damage - absorbed;
    const nextTemporaryHp = temporaryHp - absorbed;
    if (token.hp <= 0) {
      const currentSaves = token.deathSaves ?? { successes: 0, failures: 0 };
      const successes = currentSaves.successes >= 3 ? 0 : currentSaves.successes;
      const failures = Math.min(3, currentSaves.failures + (critical ? 2 : 1));
      return { ...token, temporaryHp: nextTemporaryHp, deathSaves: token.kind === "hero" ? { successes, failures } : token.deathSaves };
    }
    const nextHp = Math.max(0, token.hp - remaining);
    const overflow = Math.max(0, remaining - token.hp);
    const massiveDamage = nextHp === 0 && overflow >= token.maxHp;
    return {
      ...token,
      hp: nextHp,
      temporaryHp: nextTemporaryHp,
      ...(token.kind === "hero" ? { deathSaves: massiveDamage ? { successes: 0, failures: 3 } : { successes: 0, failures: 0 } } : {}),
    };
  };

  const applyManualDamage = () => {
    if (!selected || !canEdit || layerLocks.figures) return;
    recordEditorHistory();
    const adjusted = adjustDamageForTraits(selected, hpAdjustment, damageType);
    const updated = applyDamageToToken(selected, adjusted.amount);
    setTokens(items => items.map(token => token.id === selected.id ? updated : token));
    addLog("Урон " + selected.name + ": " + hpAdjustment + " " + damageType + (adjusted.note ? " (" + adjusted.note + ")" : "") + ". Хиты: " + updated.hp + "/" + updated.maxHp + ".", "danger");
  };

  const applyHealing = () => {
    if (!selected || !canEdit || layerLocks.figures) return;
    if ((selected.deathSaves?.failures ?? 0) >= 3) {
      addLog(selected.name + " погиб: обычное лечение не может вернуть его к жизни.", "danger");
      return;
    }
    recordEditorHistory();
    const healedHp = Math.min(selected.maxHp, selected.hp + hpAdjustment);
    const updated = { ...selected, hp: healedHp, ...(healedHp > 0 ? { deathSaves: { successes: 0, failures: 0 } } : {}) };
    setTokens(items => items.map(token => token.id === selected.id ? updated : token));
    addLog("Лечение " + selected.name + ": +" + (healedHp - selected.hp) + ". Хиты: " + healedHp + "/" + selected.maxHp + ".", "gold");
  };

  const applyTemporaryHp = () => {
    if (!selected || !canEdit || layerLocks.figures || temporaryHpInput <= 0) return;
    const previous = selected.temporaryHp ?? 0;
    const next = Math.max(previous, Math.floor(temporaryHpInput));
    if (next === previous) {
      addLog("Временные хиты не складываются: сохранено текущее большее значение (" + previous + ").");
      return;
    }
    recordEditorHistory();
    setTokens(items => items.map(token => token.id === selected.id ? { ...token, temporaryHp: next } : token));
    addLog(selected.name + " получает " + next + " временных хитов. Они не складываются с прежними.", "gold");
  };

  const rollDeathSave = async () => {
    if (!selected || selected.kind !== "hero" || selected.hp > 0 || !canEdit || diceBusy) return;
    const current = selected.deathSaves ?? { successes: 0, failures: 0 };
    if (current.successes >= 3 || current.failures >= 3) return;
    setDiceBusy(true);
    try {
      let value: number;
      if (remoteEnabled) {
        const result = await apiRequest<{ rolls: number[]; total: number }>("/dice/roll", {
          method: "POST",
          body: JSON.stringify({ count: 1, sides: 20, modifier: 0, mode: "normal" }),
        });
        value = result.rolls[0];
      } else {
        value = Math.floor(Math.random() * 20) + 1;
      }
      if (value === 20) {
        recordEditorHistory();
        setTokens(items => items.map(token => token.id === selected.id ? { ...token, hp: 1, deathSaves: { successes: 0, failures: 0 } } : token));
        addLog(selected.name + ": спасбросок от смерти — естественная 20. Персонаж восстанавливает 1 хит.", "gold");
        return;
      }
      const next = { ...current };
      if (value === 1) next.failures = Math.min(3, next.failures + 2);
      else if (value >= 10) next.successes = Math.min(3, next.successes + 1);
      else next.failures = Math.min(3, next.failures + 1);
      recordEditorHistory();
      setTokens(items => items.map(token => token.id === selected.id ? { ...token, deathSaves: next } : token));
      const state = next.failures >= 3 ? "смерть" : next.successes >= 3 ? "стабилизация" : value >= 10 ? "успех" : "провал";
      addLog(selected.name + ": спасбросок от смерти — " + value + ". Успехи " + next.successes + "/3, провалы " + next.failures + "/3: " + state + ".", next.failures >= 3 ? "danger" : next.successes >= 3 ? "gold" : "muted");
    } catch (error) {
      setTableError(error instanceof Error ? error.message : "Не удалось выполнить спасбросок от смерти.");
    } finally {
      setDiceBusy(false);
    }
  };

  const rollSelectedCheck = async () => {
    if (!selected || !canEdit || diceBusy) return;
    if (selectedRollBlocked) {
      addLog(selected.name + ": атака невозможна. " + selectedRollBlockReason, "danger");
      return;
    }
    if (rollKind === "attack" && !attackTarget) {
      addLog("Для атаки сначала добавь на карту цель.", "danger");
      return;
    }
    const checkLabel = rollKind === "attack" ? "Атака" : rollKind === "ability" ? "Проверка характеристики" : rollKind === "skill" ? "Навык: " + selectedSkillData.label : "Спасбросок: " + abilityLabels[saveAbility];
    const modifierText = effectiveRollModifier > 0 ? "+" + effectiveRollModifier : String(effectiveRollModifier);
    if (selectedSaveAutoFail) {
      addLog(selected.name + ": " + checkLabel + " — автоматический провал. " + selectedSaveFailReason, "danger");
      return;
    }
    setDiceBusy(true);
    try {
      let rolls: number[];
      let kept: number;
      let total: number;
      if (remoteEnabled) {
        const result = await apiRequest<{ rolls: number[]; keptRoll: number | null; total: number; mode: RollMode }>(
          "/dice/roll",
          { method: "POST", body: JSON.stringify({ count: 1, sides: 20, modifier: effectiveRollModifier, mode: selectedRollMode }) },
        );
        rolls = result.rolls;
        kept = result.keptRoll ?? rolls[0];
        total = result.total;
      } else {
        rolls = selectedRollMode === "normal"
          ? [Math.floor(Math.random() * 20) + 1]
          : [Math.floor(Math.random() * 20) + 1, Math.floor(Math.random() * 20) + 1];
        kept = selectedRollMode === "advantage" ? Math.max(...rolls) : selectedRollMode === "disadvantage" ? Math.min(...rolls) : rolls[0];
        total = kept + effectiveRollModifier;
      }

      if (rollKind !== "attack") {
        addLog(selected.name + ": " + checkLabel + " — " + rolls.join(" / ") + " (" + selectedRollModeLabel.toLowerCase() + ", выбрано " + kept + ") " + modifierText + " = " + total + ".", "muted");
        return;
      }

      const target = attackTarget!;
      const targetAc = Math.max(0, Number(target.armorClass ?? 10));
      const critical = kept === 20 || (attackType === "melee" && (target.conditions ?? []).some(condition => condition === "paralyzed" || condition === "unconscious"));
      const naturalOne = kept === 1;
      const hit = !naturalOne && (critical || total >= targetAc);
      addLog(
        selected.name + " атакует " + target.name + ": " + rolls.join(" / ") + " (" + selectedRollModeLabel.toLowerCase() + ", выбрано " + kept + ") " + modifierText + " = " + total + " против КД " + targetAc + " — " + (hit ? (critical ? "критическое попадание" : "попадание") : "промах") + ".",
        hit ? "gold" : "danger",
      );
      if (!hit) return;

      const parsed = parseDamageFormula(damageFormula);
      if (!parsed) {
        addLog("Попадание подтверждено, но формула урона некорректна. Формат: 1d8+3 (от 1 до 10 костей).", "danger");
        return;
      }
      const damageCount = parsed.flatDamage !== undefined ? 0 : parsed.count * (critical ? 2 : 1);
      let damageRolls: number[];
      let damageTotal: number;
      if (parsed.flatDamage !== undefined) {
        damageRolls = [];
        damageTotal = parsed.flatDamage;
      } else if (remoteEnabled) {
        const damage = await apiRequest<{ rolls: number[]; total: number }>("/dice/roll", {
          method: "POST",
          body: JSON.stringify({ count: damageCount, sides: parsed.sides, modifier: parsed.modifier, mode: "normal" }),
        });
        damageRolls = damage.rolls;
        damageTotal = damage.total;
      } else {
        damageRolls = Array.from({ length: damageCount }, () => Math.floor(Math.random() * parsed.sides) + 1);
        damageTotal = damageRolls.reduce((sum, value) => sum + value, 0) + parsed.modifier;
      }
      damageTotal = Math.max(0, damageTotal);
      const adjustedDamage = adjustDamageForTraits(target, damageTotal, damageType);
      const appliedDamage = adjustedDamage.amount;
      recordEditorHistory();
      const updatedTarget = applyDamageToToken(target, appliedDamage, critical);
      setTokens(items => items.map(token => token.id === target.id ? updatedTarget : token));
      addLog(
        "Урон " + target.name + " (" + damageType + "): " + damageRolls.join(" + ") + (parsed.modifier ? (parsed.modifier > 0 ? " + " : " - ") + Math.abs(parsed.modifier) : "") + " = " + damageTotal + (adjustedDamage.note ? " (" + adjustedDamage.note + ")" : "") + (critical ? " (критический урон: кости удвоены)" : "") + ". Хиты: " + updatedTarget.hp + "/" + updatedTarget.maxHp + (updatedTarget.temporaryHp ? ", временные хиты: " + updatedTarget.temporaryHp : "") + ".",
        "danger",
      );
    } catch (error) {
      setTableError(error instanceof Error ? error.message : "Не удалось выполнить бросок.");
    } finally {
      setDiceBusy(false);
    }
  };

  const nextTurn = () => {
    if (!canEdit || !initiative.length) return;
    const currentIndex = initiative.findIndex(token => token.id === activeToken?.id);
    const nextIndex = currentIndex < 0 ? 0 : currentIndex + 1;
    if (nextIndex >= initiative.length) {
      const first = initiative[0];
      setActiveTokenId(first.id);
      setRound(value => value + 1);
      addLog(`Раунд ${round + 1}: ход ${first.name}.`, "gold");
    } else {
      const next = initiative[nextIndex];
      setActiveTokenId(next.id);
      addLog(`Ход переходит к ${next.name}.`, "gold");
    }
  };

  const addCondition = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !canEdit || layerLocks.figures) return;
    const current = selected.conditions ?? [];
    const conditionId = conditionCatalog.find(item => item.id === conditionToAdd && !current.includes(item.id))?.id
      ?? conditionCatalog.find(item => !current.includes(item.id))?.id;
    if (!conditionId) return;
    const condition = conditionCatalog.find(item => item.id === conditionId);
    recordEditorHistory();
    setTokens(items => items.map(token => token.id === selected.id
      ? { ...token, conditions: [...(token.conditions ?? []), conditionId] }
      : token));
    setConditionToAdd(conditionCatalog.find(item => !current.includes(item.id) && item.id !== conditionId)?.id ?? conditionId);
    addLog(`${selected.name}: состояние «${condition?.label ?? conditionId}» применено.`, "gold");
  };

  const removeCondition = (conditionId: ConditionId) => {
    if (!selected || !canEdit || layerLocks.figures) return;
    recordEditorHistory();
    setTokens(items => items.map(token => token.id === selected.id
      ? { ...token, conditions: (token.conditions ?? []).filter(item => item !== conditionId) }
      : token));
    const condition = conditionCatalog.find(item => item.id === conditionId);
    addLog(`${selected.name}: состояние «${condition?.label ?? conditionId}» снято.`);
  };

  const setExhaustionLevel = (level: number) => {
    if (!selected || !canEdit || layerLocks.figures) return;
    recordEditorHistory();
    setTokens(items => items.map(token => token.id === selected.id ? { ...token, exhaustionLevel: level } : token));
    addLog(`${selected.name}: уровень истощения — ${level}.`);
  };

  const removeSelectedToken = () => {
    if (!selected || !canEdit || layerLocks.figures) return;
    const currentIndex = initiative.findIndex(token => token.id === activeToken?.id);
    const remaining = initiative.filter(token => token.id !== selected.id);
    if (selected.id === activeToken?.id) {
      const next = initiative[currentIndex + 1] ?? remaining[0];
      if (currentIndex === initiative.length - 1 && remaining.length) setRound(value => value + 1);
      setActiveTokenId(next?.id ?? null);
    }
    recordEditorHistory();
    setTokens(items => items.filter(token => token.id !== selected.id));
    setSelectedId(null);
    addLog(`${selected.name} удалён с карты.`);
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
              <input ref={mapFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleMapFileChange}/><button type="button" title="Загрузить изображение карты" aria-label="Загрузить изображение карты" disabled={!canEdit || !remoteEnabled || layerLocks.background || mapUploading} onClick={() => mapFileInputRef.current?.click()}><ImagePlus size={16}/></button>{mapAsset && <button type="button" title="Удалить подложку карты" aria-label="Удалить подложку карты" disabled={!canEdit || layerLocks.background || mapUploading} onClick={removeMapAsset}><Trash2 size={16}/></button>}<button title="Отменить последнее действие" aria-label="Отменить последнее действие" disabled={!canEdit || editorHistory.past.length === 0} onClick={undoEditor}><Undo2 size={16}/></button><button title="Повторить действие" aria-label="Повторить действие" disabled={!canEdit || editorHistory.future.length === 0} onClick={redoEditor}><Redo2 size={16}/></button><button title="Показать или скрыть сетку" className={room.grid ? "tool-active" : ""} onClick={() => setRoom(value => ({ ...value, grid: !value.grid }))} disabled={!canEdit}><Grid3X3 size={17}/></button><button title={room.snapToGrid ? "Отключить привязку к сетке" : "Включить привязку к сетке"} className={room.snapToGrid && room.grid ? "tool-active" : ""} onClick={() => setRoom(value => ({ ...value, snapToGrid: !value.snapToGrid }))} disabled={!canEdit || !room.grid}><Magnet size={16}/></button><label className="grid-cell-toolbar">Клетка <input aria-label="Размер клетки сетки в пикселях" type="number" min="12" max="120" step="1" value={room.gridCellSizePx ?? 38} onChange={event => setRoom(value => ({ ...value, gridCellSizePx: Math.max(12, Math.min(120, Number(event.target.value) || 38)) }))} disabled={!canEdit}/><span>px</span></label>
              <button title="Уменьшить" onClick={() => setZoom(value => Math.max(60, value - 10))}><ZoomOut size={17}/></button><span>{zoom}%</span><button title="Увеличить" onClick={() => setZoom(value => Math.min(150, value + 10))}><ZoomIn size={17}/></button>
            </div>
            <div className="table-tool-group"><span className="scene-label"><Eye size={14}/> {canEdit ? "Редактор комнаты" : "Только просмотр"}</span></div>
          </div>
          <div className={`battle-map map-${room.mapTheme} ${room.grid ? "with-grid" : ""} ${mapAsset && layerVisibility.background ? "has-uploaded-map" : ""}`} style={{ "--grid-cell-size": `${room.gridCellSizePx ?? 38}px`, "--scaled-grid-cell-size": `${(room.gridCellSizePx ?? 38) * zoom / 100}px`, "--map-zoom": zoom / 100, "--map-image-scale": mapView.scale, "--map-offset-x": `${mapView.x}%`, "--map-offset-y": `${mapView.y}%` } as React.CSSProperties} onPointerMove={moveToken} onPointerUp={() => { setDraggingId(null); finishHistoryGroup(); }} onPointerLeave={() => { setDraggingId(null); finishHistoryGroup(); }}>
            {mapAsset && layerVisibility.background && <img className="uploaded-map-image" src={mapAsset.url} alt="Загруженная карта игровой комнаты"/>}
            {mapAsset && layerVisibility.background && canEdit && !layerLocks.background && <div className="map-image-controls" onPointerDown={event => event.stopPropagation()}>
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
              {(layerVisibility.figures ? tokens : []).map(token => <button key={token.id} className={`map-token token-${token.color} ${selectedId === token.id ? "token-selected" : ""} ${activeToken?.id === token.id ? "token-active" : ""}`} style={{ left: `${token.x}%`, top: `${token.y}%`, cursor: canEdit && !layerLocks.figures ? "grab" : "default" }} onPointerDown={event => { if (!canEdit || layerLocks.figures) { setSelectedId(token.id); return; } event.preventDefault(); setSelectedId(token.id); beginHistoryGroup(); setDraggingId(token.id); event.currentTarget.setPointerCapture(event.pointerId); }} onClick={() => setSelectedId(token.id)} title={token.name}>
                <span className="token-glyph">{token.kind === "enemy" ? "!" : token.kind === "ally" ? "✦" : "♟"}</span><span className="token-label">{token.name}</span><span className="token-health"><i style={{ width: `${(token.hp / token.maxHp) * 100}%` }}/></span>{((token.conditions?.length ?? 0) > 0 || (token.exhaustionLevel ?? 0) > 0) && <span className="token-condition-count" title={[...(token.conditions ?? []).map(id => conditionCatalog.find(condition => condition.id === id)?.label ?? id), ...(token.exhaustionLevel ? [`Истощение ${token.exhaustionLevel}`] : [])].join(", ")}>{(token.conditions?.length ?? 0) + (token.exhaustionLevel ? 1 : 0)}</span>}
              </button>)}
            </div>
            {tokens.length === 0 && (!mapAsset || !layerVisibility.background) && <div className="empty-map-hint"><Map size={27}/><strong>Карта пока пуста</strong><span>Добавь участников и расставь их на поле. Окружение и декорации можно будет разместить в редакторе карты.</span></div>}
            <RoomMapEditor objects={objects} onChange={updateObjects} canEdit={canEdit} visibleLayers={layerVisibility} onVisibilityChange={updateLayerVisibility} layerLocks={layerLocks} onLayerLocksChange={updateLayerLocks} onEditStart={beginHistoryGroup} onEditEnd={finishHistoryGroup} snapToGrid={room.grid && room.snapToGrid} gridCellSizePx={room.gridCellSizePx ?? 38} zoom={zoom}/><div className="map-coordinates"><span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span><span>G</span><span>H</span></div>
          </div>
          <div className="map-caption"><span><i className="legend-dot hero-dot"/> Союзники</span><span><i className="legend-dot enemy-dot"/> Противники</span><span>{canEdit ? "Перетаскивай фигуры мышью" : "Сцена доступна для просмотра"}</span></div>
        </div>
        <aside className="table-sidebar">
          <section className="table-panel">
            <div className="table-panel-title"><div><Swords size={16}/><strong>Инициатива</strong></div><span>Раунд {round}</span></div>
            {initiative.length ? <div className="initiative-list">{initiative.map(token => <button key={token.id} className={`initiative-row ${activeToken?.id === token.id ? "initiative-current" : ""} ${selectedId === token.id ? "initiative-selected" : ""}`} onClick={() => setSelectedId(token.id)}><span className={`initiative-avatar token-${token.color}`}>{token.kind === "enemy" ? "!" : "♟"}</span><span className="initiative-name">{token.name}<small>{token.kind === "enemy" ? "Противник" : "Участник"}</small></span><b>{token.initiative}</b>{activeToken?.id === token.id && <i className="turn-indicator"/>}</button>)}</div> : <p className="room-empty-note">Добавленные участники появятся здесь.</p>}
            <button className="button button-primary full-width next-turn" onClick={nextTurn} disabled={!canEdit || !initiative.length}>Следующий ход <ChevronRight size={16}/></button>
          </section>
          {selected && <section className="table-panel selected-panel">
            <div className="table-panel-title"><div><Shield size={16}/><strong>Выбранная фигура</strong></div></div>
            <div className="selected-token-title"><span className={`initiative-avatar token-${selected.color}`}>{selected.kind === "enemy" ? "!" : "♟"}</span><div><strong>{selected.name}</strong><small>{selected.kind === "enemy" ? "Противник" : "Союзник"}</small></div></div>
            <div className="hp-line"><span>Хиты</span><b>{selected.hp} / {selected.maxHp}{(selected.temporaryHp ?? 0) > 0 ? ` · +${selected.temporaryHp} врем.` : ""}</b></div><div className="hp-track"><i style={{ width: `${(selected.hp / selected.maxHp) * 100}%` }}/></div>
            <div className="hp-management">
              <label>Количество<input type="number" min="1" max="999" value={hpAdjustment} onChange={event => setHpAdjustment(Math.max(1, Math.min(999, Number(event.target.value) || 1)))} disabled={!canEdit || layerLocks.figures}/></label>
              <label>Тип урона<select value={damageType} onChange={event => setDamageType(event.target.value as DamageType)} disabled={!canEdit || layerLocks.figures}>{damageTypeOptions.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
              <button type="button" onClick={applyManualDamage} disabled={!canEdit || layerLocks.figures}>Урон</button>
              <button type="button" onClick={applyHealing} disabled={!canEdit || layerLocks.figures || (selected.deathSaves?.failures ?? 0) >= 3}>Лечение</button>
              <label>Временные хиты<input type="number" min="1" max="999" value={temporaryHpInput} onChange={event => setTemporaryHpInput(Math.max(1, Math.min(999, Number(event.target.value) || 1)))} disabled={!canEdit || layerLocks.figures}/></label>
              <button type="button" onClick={applyTemporaryHp} disabled={!canEdit || layerLocks.figures}>Применить</button>
            </div>
            {selected.kind === "hero" && selected.hp === 0 && <div className="death-save-panel">
              <strong>Спасброски от смерти</strong>
              <span>Успехи: {selected.deathSaves?.successes ?? 0}/3 · Провалы: {selected.deathSaves?.failures ?? 0}/3</span>
              <button type="button" onClick={rollDeathSave} disabled={!canEdit || diceBusy || (selected.deathSaves?.successes ?? 0) >= 3 || (selected.deathSaves?.failures ?? 0) >= 3}>{(selected.deathSaves?.successes ?? 0) >= 3 ? "Персонаж стабилизирован" : (selected.deathSaves?.failures ?? 0) >= 3 ? "Персонаж погиб" : diceBusy ? "Бросок…" : "Бросить спасбросок"}</button>
            </div>}
            <div className="combat-roll-panel">
              <strong>Проверка D20</strong>
              <div className="combat-roll-row">
                <select value={rollKind} onChange={event => setRollKind(event.target.value as RollKind)} disabled={!canEdit}>
                  <option value="attack">Атака</option><option value="ability">Проверка характеристики</option><option value="skill">Проверка навыка</option><option value="save">Спасбросок</option>
                </select>
                {rollKind === "skill" && <select value={selectedSkill} onChange={event => setSelectedSkill(event.target.value as SkillId)} disabled={!canEdit}>
                  {skillLabels.map(skill => <option key={skill.id} value={skill.id}>{skill.label} ({abilityLabels[skill.ability]})</option>)}
                </select>}
                {rollKind === "save" && <select value={saveAbility} onChange={event => setSaveAbility(event.target.value as AbilityId)} disabled={!canEdit}>
                  {(Object.keys(abilityLabels) as AbilityId[]).map(ability => <option key={ability} value={ability}>{abilityLabels[ability]}</option>)}
                </select>}
                <input type="number" value={rollModifier} min={-100} max={100} onChange={event => setRollModifier(Math.max(-100, Math.min(100, Number(event.target.value) || 0)))} disabled={!canEdit || rollKind === "skill"} aria-label="Дополнительный модификатор броска" title={rollKind === "skill" ? "Модификатор автоматически взят из листа персонажа" : "Дополнительный модификатор к базовому бонусу"}/>
              </div>
              {rollKind === "attack" && <div className="combat-attack-options">
                <label>Оружие<select value={selectedWeaponId} onChange={event => selectWeapon(event.target.value)} disabled={!canEdit}>
                  {weaponOptions.map(weapon => <option key={weapon.id} value={weapon.id}>{weapon.name} · {weapon.damage} {weapon.damageType}</option>)}
                </select></label>
                <label>Цель<select value={attackTarget?.id ?? ""} onChange={event => setAttackTargetId(event.target.value)} disabled={!canEdit || attackTargets.length === 0}>
                  {attackTargets.map(token => <option key={token.id} value={token.id}>{token.name} · КД {token.armorClass ?? 10}</option>)}
                </select></label>
                {selectedWeapon?.versatileDamage && <label className="weapon-proficiency-toggle"><input type="checkbox" checked={useVersatileDamage} onChange={event => toggleVersatileDamage(event.target.checked)} disabled={!canEdit}/> Двумя руками ({selectedWeapon.versatileDamage})</label>}
                <label>Вид атаки<select value={attackType} onChange={event => setAttackType(event.target.value as "melee" | "ranged")} disabled={!canEdit}>
                  <option value="melee">Ближний бой (до 5 футов)</option><option value="ranged">Дальний бой</option>
                </select></label>
                <label>Характеристика<select value={attackAbility} onChange={event => setAttackAbility(event.target.value as AbilityId)} disabled={!canEdit}>
                  <option value="strength">Сила</option><option value="dexterity">Ловкость</option>
                </select></label>
                <label className="weapon-proficiency-toggle"><input type="checkbox" checked={useWeaponProficiency} onChange={event => setUseWeaponProficiency(event.target.checked)} disabled={!canEdit}/> Владение оружием (+{selected?.proficiencyBonus ?? 0})</label>
                <span className="attack-bonus-preview">Бонус атаки: {effectiveRollModifier >= 0 ? "+" : ""}{effectiveRollModifier}</span>
                <label>Урон<input value={damageFormula} onChange={event => setDamageFormula(event.target.value)} placeholder="1d8+3" disabled={!canEdit} aria-label="Формула урона"/></label>
              </div>}
              <select className="combat-roll-mode" value={rollModeOverride} onChange={event => setRollModeOverride(event.target.value as RollModeOverride)} disabled={!canEdit}>
                <option value="auto">Автоматически по состояниям</option><option value="normal">Обычный бросок</option><option value="advantage">Преимущество</option><option value="disadvantage">Помеха</option>
              </select>
              <span className={selectedRollBlocked || selectedSaveAutoFail ? "combat-roll-warning" : "combat-roll-hint"}>
                {selectedRollBlocked ? selectedRollBlockReason : selectedSaveAutoFail ? selectedSaveFailReason : `Режим: ${selectedRollModeLabel.toLowerCase()}.`}
              </span>
              <button type="button" onClick={rollSelectedCheck} disabled={!canEdit || diceBusy || selectedRollBlocked}>{diceBusy ? "Бросок…" : "Бросить D20"}</button>
            </div>
            <details className="damage-traits-panel">
              <summary>Сопротивления, уязвимости и иммунитеты</summary>
              <label>Сопротивления<select multiple size={3} value={selected.damageResistances ?? []} disabled={!canEdit || layerLocks.figures} onChange={event => {
                const values = Array.from(event.currentTarget.selectedOptions, option => option.value as DamageType);
                recordEditorHistory();
                setTokens(items => items.map(token => token.id === selected.id ? { ...token, damageResistances: values } : token));
              }}>{damageTypeOptions.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
              <label>Уязвимости<select multiple size={3} value={selected.damageVulnerabilities ?? []} disabled={!canEdit || layerLocks.figures} onChange={event => {
                const values = Array.from(event.currentTarget.selectedOptions, option => option.value as DamageType);
                recordEditorHistory();
                setTokens(items => items.map(token => token.id === selected.id ? { ...token, damageVulnerabilities: values } : token));
              }}>{damageTypeOptions.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
              <label>Иммунитеты<select multiple size={3} value={selected.damageImmunities ?? []} disabled={!canEdit || layerLocks.figures} onChange={event => {
                const values = Array.from(event.currentTarget.selectedOptions, option => option.value as DamageType);
                recordEditorHistory();
                setTokens(items => items.map(token => token.id === selected.id ? { ...token, damageImmunities: values } : token));
              }}>{damageTypeOptions.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
              <small>Выбери несколько типов с Ctrl/⌘. Эти свойства учитываются при ручном и автоматическом нанесении урона.</small>
            </details>
            <div className="condition-panel">
              <strong>Состояния</strong>
              <div className="condition-chip-list">
                {(selected.conditions ?? []).length ? (selected.conditions ?? []).map(conditionId => {
                  const condition = conditionCatalog.find(item => item.id === conditionId);
                  return <button type="button" key={conditionId} className="condition-chip" title={condition?.description ?? conditionId} disabled={!canEdit || layerLocks.figures} onClick={() => removeCondition(conditionId)}>{condition?.label ?? conditionId}{canEdit ? " ×" : ""}</button>;
                }) : <span className="condition-empty">Нет активных состояний</span>}
              </div>
              {canEdit && <form className="condition-add-form" onSubmit={addCondition}>
                <select value={activeConditionToAdd} onChange={event => setConditionToAdd(event.target.value as ConditionId)} disabled={layerLocks.figures || availableConditions.length === 0}>
                  {availableConditions.map(condition => <option key={condition.id} value={condition.id}>{condition.label}</option>)}
                </select>
                <button type="submit" disabled={layerLocks.figures || availableConditions.length === 0}>Добавить</button>
              </form>}
              <label className="exhaustion-control">Истощение
                <select value={selected.exhaustionLevel ?? 0} onChange={event => setExhaustionLevel(Number(event.target.value))} disabled={!canEdit || layerLocks.figures}>
                  {exhaustionOptions.map((label, level) => <option key={level} value={level}>{label}</option>)}
                </select>
              </label>
            </div>
            <div className="token-actions">{canEdit && <button disabled={activeToken?.id === selected.id} onClick={() => { setActiveTokenId(selected.id); addLog("Текущий ход: " + selected.name + ".", "gold"); }}>Сделать активным</button>}<button disabled={!canEdit || layerLocks.figures} onClick={removeSelectedToken}>Убрать</button></div>
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
              <div className="add-token-fields"><label>Тип<select value={newTokenKind} onChange={event => setNewTokenKind(event.target.value as Token["kind"])} disabled={!canEdit}><option value="hero">Герой</option><option value="ally">Союзник</option><option value="enemy">Противник</option></select></label><label>Хиты<input type="number" min="1" max="999" value={newTokenHp} onChange={event => setNewTokenHp(Number(event.target.value))} disabled={!canEdit || layerLocks.figures}/></label><label>КД<input type="number" min="0" max="40" value={newTokenAc} onChange={event => setNewTokenAc(Number(event.target.value))} disabled={!canEdit || layerLocks.figures}/></label><label>Инициатива<input type="number" min="-10" max="40" value={newTokenInitiative} onChange={event => setNewTokenInitiative(Number(event.target.value))} disabled={!canEdit || layerLocks.figures}/></label></div>
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
