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
const getGridDistanceFeet = (
  first: { x: number; y: number },
  second: { x: number; y: number },
  bounds: DOMRect | undefined,
  cellSizePx: number,
): number | null => {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0 || cellSizePx <= 0) return null;
  const horizontal = Math.round(Math.abs(first.x - second.x) / 100 * bounds.width / cellSizePx);
  const vertical = Math.round(Math.abs(first.y - second.y) / 100 * bounds.height / cellSizePx);
  const diagonal = Math.min(horizontal, vertical);
  const straight = Math.max(horizontal, vertical) - diagonal;
  const diagonalFeet = Math.floor(diagonal / 2) * 15 + (diagonal % 2) * 5;
  return (straight * 5) + diagonalFeet;
};

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
type ClassResource = { id: string; name: string; max: number; used: number; recovery: "short" | "long" | "manual" };
type PactMagic = { level: number; max: number; used: number };
type Token = { id: string; name: string; kind: "hero" | "enemy" | "ally"; classLevel?: number; className?: string; raging?: boolean; bardicInspirationDie?: number; bardicInspirationSource?: string; sneakAttackUsedTurnKey?: string; x: number; y: number; hp: number; maxHp: number; color: string; initiative: number; armorClass?: number; proficiencyBonus?: number; abilityModifiers?: Partial<Record<AbilityId, number>>; weaponProficiencies?: string[]; weaponAmmo?: Record<string, number>; loadingUsedWeapons?: string[]; actionUsed?: boolean; bonusActionUsed?: boolean; reactionUsed?: boolean; concentrating?: boolean; constitutionSaveProficient?: boolean; knownSpells?: string[]; hitDice?: { dieSides: number; total: number; used: number }; spellSlots?: Record<number, { max: number; used: number }>; pactMagic?: PactMagic; temporaryHp?: number; deathSaves?: { successes: number; failures: number }; damageResistances?: DamageType[]; damageVulnerabilities?: DamageType[]; damageImmunities?: DamageType[]; conditions?: ConditionId[]; exhaustionLevel?: number; skillModifiers?: Partial<Record<SkillId, number>>; classResources?: ClassResource[] };
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
type TableChatMessage = { id: string; content: string; createdAt: string; author: { username: string } };
type TableResponse = { state: Partial<TableState>; updatedAt: string | null; chatMessages?: TableChatMessage[]; chatCursor?: string | null; permissions?: { canEdit: boolean } };
type EditorSnapshot = { tokens: Token[]; objects: MapObject[]; layerVisibility: LayerVisibility; layerLocks: LayerLocks; mapView: MapView };
type EditorHistory = { past: EditorSnapshot[]; future: EditorSnapshot[] };
const cloneEditorSnapshot = (snapshot: EditorSnapshot): EditorSnapshot => JSON.parse(JSON.stringify(snapshot)) as EditorSnapshot;
const defaultMapView: MapView = { scale: 1, x: 0, y: 0 };

const emptyRoom: RoomSettings = { configured: false, published: false, name: "", description: "", mapTheme: "sand", grid: true, snapToGrid: true, gridCellSizePx: 38 };
const localKey = (id: string) => `dnd-dcorp-table-${id}`;
const localChatKey = (id: string) => `${localKey(id)}-chat`;
const recoveryKey = (id: string) => `${localKey(id)}-pending-recovery`;
type TableRecovery = { state: TableState; savedAt: number; supersedes?: TableState };
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
  const battleMapRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
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
  const [attackAbility, setAttackAbility] = useState<AbilityId>("dexterity");
  const [useWeaponProficiency, setUseWeaponProficiency] = useState(false);
  const [saveAbility, setSaveAbility] = useState<AbilityId>("strength");
  const [rollModeOverride, setRollModeOverride] = useState<RollModeOverride>("auto");
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<TableChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
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
  const [inspirationTargetId, setInspirationTargetId] = useState("");
  const [useBardicInspiration, setUseBardicInspiration] = useState(false);
  const [useSneakAttack, setUseSneakAttack] = useState(false);
  const [damageFormula, setDamageFormula] = useState("1d4");
  const [damageType, setDamageType] = useState<DamageType>("piercing");
  const [weaponOptions, setWeaponOptions] = useState<WeaponOption[]>(fallbackWeapons);
  const [selectedWeaponId, setSelectedWeaponId] = useState("dagger");
  const [useVersatileDamage, setUseVersatileDamage] = useState(false);
  const [attackType, setAttackType] = useState<"melee" | "ranged">("melee");
  const [attackResource, setAttackResource] = useState<"actionUsed" | "bonusActionUsed" | "reactionUsed">("actionUsed");
  const [spellName, setSpellName] = useState("");
  const [spellLevel, setSpellLevel] = useState(1);
  const [spellResource, setSpellResource] = useState<"actionUsed" | "bonusActionUsed" | "reactionUsed">("actionUsed");
  const [spellConcentration, setSpellConcentration] = useState(false);
  const [usePactMagic, setUsePactMagic] = useState(false);
  const [classResourceName, setClassResourceName] = useState("");
  const [classResourceMax, setClassResourceMax] = useState(1);
  const [classResourceRecovery, setClassResourceRecovery] = useState<ClassResource["recovery"]>("short");
  const dirtyRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const inFlightStateRef = useRef<TableState | null>(null);
  const latestStateRef = useRef<TableState | null>(null);
  const updatedAtRef = useRef<string | null>(null);
  const chatCursorRef = useRef<string | null>(null);
  const initiative = useMemo(() => [...tokens].sort((a, b) => b.initiative - a.initiative), [tokens]);
  const activeToken = initiative.find(token => token.id === activeTokenId) ?? initiative[0];
  const selected = tokens.find(token => token.id === selectedId);
  const attackTargets = selected ? tokens.filter(token => token.id !== selected.id) : [];
  const attackTarget = attackTargets.find(token => token.id === attackTargetId) ?? attackTargets[0];
  const inspirationTargets = selected ? tokens.filter(token => token.id !== selected.id && token.kind !== "enemy") : [];
  const inspirationTarget = inspirationTargets.find(token => token.id === inspirationTargetId) ?? inspirationTargets[0];
  const selectedWeapon = weaponOptions.find(weapon => weapon.id === selectedWeaponId) ?? weaponOptions[0];
  const latestTableState: TableState = { room, tokens, objects, layerVisibility, layerLocks, mapAsset, mapView, round, activeTokenId, log };
  latestStateRef.current = latestTableState;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages.length]);

  useEffect(() => {
    setUseBardicInspiration(false);
    setUseSneakAttack(false);
  }, [selected?.id, selected?.bardicInspirationDie]);

  useEffect(() => {
    if (!selected || !selectedWeapon) {
      setUseWeaponProficiency(false);
      return;
    }
    const proficiencies = selected.weaponProficiencies ?? [];
    const proficient = proficiencies.some(value => value === selectedWeapon.category || value === selectedWeapon.id || value === "all" || value === selectedWeapon.category + " weapons" || value === (selectedWeapon.category === "simple" ? "простое оружие" : "воинское оружие"));
    setUseWeaponProficiency(proficient);
  }, [selected?.id, selectedWeapon?.id, weaponOptions.length]);
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
    setChatMessages(Array.isArray(response.chatMessages) ? response.chatMessages : []);
    chatCursorRef.current = response.chatCursor ?? null;
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
        const savedChat = window.localStorage.getItem(localChatKey(campaignId));
        if (savedChat) {
          const parsedChat = JSON.parse(savedChat) as unknown;
          setChatMessages(Array.isArray(parsedChat) ? parsedChat as TableChatMessage[] : []);
        }
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
        let restored = false;
        try {
          const rawRecovery = window.localStorage.getItem(recoveryKey(campaignId));
          if (rawRecovery) {
            const recovery = JSON.parse(rawRecovery) as TableRecovery;
            const serverTime = response.updatedAt ? new Date(response.updatedAt).getTime() : 0;
            const serverMatchesRecovery = JSON.stringify(response.state ?? {}) === JSON.stringify(recovery?.state ?? null);
            const serverContainsOlderInFlightSave = Boolean(recovery?.supersedes && JSON.stringify(response.state ?? {}) === JSON.stringify(recovery.supersedes));
            if (serverMatchesRecovery) {
              window.localStorage.removeItem(recoveryKey(campaignId));
            } else if (recovery?.state && Number.isFinite(recovery.savedAt) && (recovery.savedAt > serverTime || serverContainsOlderInFlightSave)) {
              applyRemoteState({ ...response, state: recovery.state });
              setTableError("Восстановлены последние локальные изменения комнаты. Сохраняем их на сервере…");
              restored = true;
            } else {
              window.localStorage.removeItem(recoveryKey(campaignId));
            }
          }
        } catch {
          window.localStorage.removeItem(recoveryKey(campaignId));
        }
        if (!restored) {
          applyRemoteState(response);
          setTableError("");
        }
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
        if (!active) return;
        const tableChanged = Boolean(response.updatedAt && response.updatedAt !== updatedAtRef.current);
        const chatChanged = (response.chatCursor ?? null) !== chatCursorRef.current;
        if (tableChanged) applyRemoteState(response);
        else if (chatChanged) {
          setChatMessages(Array.isArray(response.chatMessages) ? response.chatMessages : []);
          chatCursorRef.current = response.chatCursor ?? null;
        }
      } catch { /* Keep the last known room visible during temporary network loss. */ }
    }, 3000);
    return () => { active = false; window.clearInterval(poll); };
  }, [campaignId, remoteEnabled]);

  useEffect(() => {
    if (!campaignId || !tableLoaded) return;
    const state = latestTableState;
    if (!remoteEnabled) {
      try { window.localStorage.setItem(localKey(campaignId), JSON.stringify(state)); } catch { /* Local storage may be unavailable. */ }
      return;
    }
    if (!canEdit) return;
    dirtyRef.current = true;
    try {
      window.localStorage.setItem(recoveryKey(campaignId), JSON.stringify({ state, savedAt: Date.now(), supersedes: inFlightStateRef.current ?? undefined } satisfies TableRecovery));
    } catch { /* The server remains the primary store if local recovery storage is unavailable. */ }
    let cancelled = false;
    let timeout = 0;
    const save = async () => {
      timeout = 0;
      if (cancelled) return;
      if (saveInFlightRef.current) {
        timeout = window.setTimeout(save, 200);
        return;
      }
      saveInFlightRef.current = true;
      inFlightStateRef.current = state;
      try {
        const response = await apiRequest<TableResponse>(`/campaigns/${campaignId}/table`, { method: "PUT", body: JSON.stringify({ state }) });
        updatedAtRef.current = response.updatedAt;
        setLastUpdated(response.updatedAt ? new Date(response.updatedAt).toLocaleTimeString() : "");
        try {
          const rawRecovery = window.localStorage.getItem(recoveryKey(campaignId));
          const recovery = rawRecovery ? JSON.parse(rawRecovery) as TableRecovery : null;
          if (recovery && JSON.stringify(recovery.state) === JSON.stringify(state)) {
            window.localStorage.removeItem(recoveryKey(campaignId));
          }
        } catch { /* Ignore recovery-cache cleanup failures. */ }
        setTableError("");
      } catch (error) {
        setTableError(error instanceof Error ? error.message : "Не удалось сохранить комнату. Повторяем попытку…");
        timeout = window.setTimeout(save, 2000);
      } finally {
        saveInFlightRef.current = false;
        if (inFlightStateRef.current === state) inFlightStateRef.current = null;
        if (JSON.stringify(latestStateRef.current) === JSON.stringify(state) && !timeout) dirtyRef.current = false;
      }
    };
    timeout = window.setTimeout(save, 500);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [room, tokens, objects, layerVisibility, layerLocks, mapAsset, mapView, round, activeTokenId, log, campaignId, remoteEnabled, tableLoaded, canEdit]);

  useEffect(() => {
    if (!remoteEnabled || !campaignId) return;
    const saveOnPageHide = () => {
      const state = latestStateRef.current;
      if (!state || !canEdit) return;
      try {
        window.localStorage.setItem(recoveryKey(campaignId), JSON.stringify({ state, savedAt: Date.now(), supersedes: inFlightStateRef.current ?? undefined } satisfies TableRecovery));
      } catch { /* Keepalive save is still attempted when local storage is unavailable. */ }
      if (saveInFlightRef.current) return;
      saveInFlightRef.current = true;
      void apiRequest<TableResponse>(`/campaigns/${campaignId}/table`, {
        method: "PUT",
        body: JSON.stringify({ state }),
        keepalive: true,
      }).catch(() => undefined).finally(() => { saveInFlightRef.current = false; inFlightStateRef.current = null; });
    };
    window.addEventListener("pagehide", saveOnPageHide);
    return () => window.removeEventListener("pagehide", saveOnPageHide);
  }, [campaignId, remoteEnabled, canEdit]);

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
    const nestedData = (character.data.rawData ?? {}) as Record<string, unknown>;
    const data = { ...nestedData, ...character.data };
    const hp = (data.hitPoints as { maximum?: number } | undefined)?.maximum ?? 1;
    const initiativeValue = Number(data.initiative ?? 0);
    const rawAbilityModifiers = (data.abilityModifiers ?? {}) as Record<string, number>;
    const abilityScores = (data.abilityScores ?? {}) as Record<string, number>;
    const abilityModifier = (key: string) => Math.floor((Number(abilityScores[key] ?? 10) - 10) / 2);
    const rawSaveProficiencies = Array.isArray(data.savingThrowProficiencies) ? data.savingThrowProficiencies as string[] : [];
    const constitutionSaveProficient = rawSaveProficiencies.includes("con") || rawSaveProficiencies.includes("constitution");
    const level = Math.max(1, Math.min(20, Number(data.level ?? 1)));
    const proficiencyBonus = Number(data.proficiencyBonus ?? (2 + Math.floor((level - 1) / 4)));
    const spellcastingData = (data.spellcasting ?? {}) as Record<string, unknown>;
    const rawSpellSlots = (data.spellSlots ?? spellcastingData.spellSlots ?? {}) as Record<string, unknown>;
    const importedSpellSlots: Record<number, { max: number; used: number }> = {};
    for (let spellLevel = 1; spellLevel <= 9; spellLevel += 1) {
      const rawSlot = rawSpellSlots[spellLevel] ?? rawSpellSlots[String(spellLevel)];
      if (typeof rawSlot === "number" && Number.isFinite(rawSlot)) {
        importedSpellSlots[spellLevel] = { max: Math.max(0, Math.min(20, rawSlot)), used: 0 };
      } else if (rawSlot && typeof rawSlot === "object") {
        const slot = rawSlot as { max?: unknown; total?: unknown; used?: unknown; remaining?: unknown };
        const max = Number(slot.max ?? slot.total ?? (slot.remaining !== undefined && slot.used !== undefined ? Number(slot.remaining) + Number(slot.used) : slot.remaining ?? 0));
        const used = Number(slot.used ?? (slot.remaining !== undefined ? Math.max(0, max - Number(slot.remaining)) : 0));
        if (Number.isFinite(max) && Number.isFinite(used)) importedSpellSlots[spellLevel] = { max: Math.max(0, Math.min(20, max)), used: Math.max(0, Math.min(max, used)) };
      }
    }
    const rawSpells = data.spells ?? spellcastingData.spells;
    const knownSpells = Array.isArray(rawSpells) ? rawSpells.map(spell => typeof spell === "string" ? spell : spell && typeof spell === "object" ? String((spell as { name?: unknown; title?: unknown }).name ?? (spell as { title?: unknown }).title ?? "") : "").filter(Boolean) : [];
    const rawHitDice = data.hitDice as { die?: unknown; sides?: unknown; total?: unknown; remaining?: unknown; used?: unknown } | undefined;
    const importedDieText = String(rawHitDice?.die ?? data.hitDie ?? "d8");
    const importedDieSides = Number(rawHitDice?.sides ?? importedDieText.match(/d(4|6|8|10|12|20)/i)?.[1] ?? 8);
    const importedHitDiceTotal = Math.max(0, Math.min(20, Number(rawHitDice?.total ?? data.level ?? 1)));
    const importedHitDiceUsed = Math.max(0, Math.min(importedHitDiceTotal, Number(rawHitDice?.used ?? (rawHitDice?.remaining !== undefined ? importedHitDiceTotal - Number(rawHitDice.remaining) : 0))));
    const hitDice = { dieSides: [4,6,8,10,12,20].includes(importedDieSides) ? importedDieSides : 8, total: importedHitDiceTotal, used: importedHitDiceUsed };
    const className = String(data.className ?? data.characterClass ?? data.class ?? "").toLowerCase();
    const isWarlock = className.includes("колдун") || className.includes("warlock");
    const pactMagicLevel = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1;
    const pactMagicMax = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1;
    const rawPactMagic = (data.pactMagic ?? spellcastingData.pactMagic) as { level?: unknown; max?: unknown; used?: unknown } | undefined;
    const pactMagic: PactMagic | undefined = isWarlock ? { level: Math.max(1, Math.min(5, Number(rawPactMagic?.level ?? pactMagicLevel))), max: Math.max(1, Math.min(4, Number(rawPactMagic?.max ?? pactMagicMax))), used: Math.max(0, Math.min(4, Number(rawPactMagic?.used ?? 0))) } : undefined;
    const rawClassResources = Array.isArray(data.classResources) ? data.classResources as Record<string, unknown>[] : [];
    const classResources: ClassResource[] = rawClassResources.map((resource, index) => ({ id: String(resource.id ?? `resource-${index}`), name: String(resource.name ?? "Ресурс класса"), max: Math.max(0, Math.min(99, Number(resource.max ?? resource.total ?? 1))), used: Math.max(0, Math.min(99, Number(resource.used ?? 0))), recovery: resource.recovery === "long" || resource.recovery === "manual" ? resource.recovery : "short" }));
    const autoResources: ClassResource[] = [];
    const addAutomaticResource = (id: string, name: string, max: number, recovery: ClassResource["recovery"]) => {
      if (max < 1 || classResources.some(resource => resource.id === id || resource.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
      autoResources.push({ id, name, max, used: 0, recovery });
    };
    if (className.includes("воин") || className.includes("fighter")) {
      addAutomaticResource("auto-second-wind", "Второе дыхание", level >= 17 ? 2 : 1, "short");
    }
    if (className.includes("варвар") || className.includes("barbarian")) {
      const rageUses = level >= 20 ? 99 : level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2;
      addAutomaticResource("auto-rage", "Ярость", rageUses, level >= 20 ? "short" : "long");
    }
    if (className.includes("бард") || className.includes("bard")) {
      const inspirationUses = Math.max(1, Number(rawAbilityModifiers.cha ?? rawAbilityModifiers.charisma ?? abilityModifier("cha")));
      addAutomaticResource("auto-bardic-inspiration", "Вдохновение барда", inspirationUses, level >= 5 ? "short" : "long");
    }
    classResources.push(...autoResources);
    const token: Token = { id: newId(), name: character.name, kind: "hero", classLevel: level, className, x: 50, y: 50, hp: Number(hp), maxHp: Number(hp), color: "gold", initiative: initiativeValue, armorClass: Number(data.armorClass ?? 10), proficiencyBonus, constitutionSaveProficient, knownSpells, hitDice, spellSlots: importedSpellSlots, abilityModifiers: { strength: Number(rawAbilityModifiers.str ?? rawAbilityModifiers.strength ?? abilityModifier("str")), dexterity: Number(rawAbilityModifiers.dex ?? rawAbilityModifiers.dexterity ?? abilityModifier("dex")), constitution: Number(rawAbilityModifiers.con ?? rawAbilityModifiers.constitution ?? abilityModifier("con")), intelligence: Number(rawAbilityModifiers.int ?? rawAbilityModifiers.intelligence ?? abilityModifier("int")), wisdom: Number(rawAbilityModifiers.wis ?? rawAbilityModifiers.wisdom ?? abilityModifier("wis")), charisma: Number(rawAbilityModifiers.cha ?? rawAbilityModifiers.charisma ?? abilityModifier("cha")) }, weaponProficiencies: ((data.proficiencies as { weapons?: string[] } | undefined)?.weapons ?? []), weaponAmmo: (data.weaponAmmo as Record<string, number> | undefined) ?? {}, loadingUsedWeapons: [], temporaryHp: Number((data.hitPoints as { temporary?: number } | undefined)?.temporary ?? 0), deathSaves: data.deathSaves as { successes: number; failures: number } | undefined, damageResistances: data.damageResistances as DamageType[] | undefined, damageVulnerabilities: data.damageVulnerabilities as DamageType[] | undefined, damageImmunities: data.damageImmunities as DamageType[] | undefined, skillModifiers: data.skillModifiers as Partial<Record<SkillId, number>> | undefined, classResources, pactMagic };
    recordEditorHistory();
    setTokens(items => [...items, token]);
    addLog(`Персонаж кампании добавлен на карту: ${character.name}.`);
  };

  const addClassResource = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !canEdit || layerLocks.figures || !classResourceName.trim()) return;
    const resource: ClassResource = { id: newId(), name: classResourceName.trim(), max: Math.max(1, Math.min(99, classResourceMax)), used: 0, recovery: classResourceRecovery };
    recordEditorHistory();
    setTokens(items => items.map(token => token.id === selected.id ? { ...token, classResources: [...(token.classResources ?? []), resource] } : token));
    addLog(selected.name + ": добавлен ресурс класса «" + resource.name + "».", "muted");
    setClassResourceName("");
    setClassResourceMax(1);
  };

  const updateClassResource = (resourceId: string, patch: Partial<Pick<ClassResource, "max" | "used">>) => {
    if (!selected || !canEdit || layerLocks.figures) return;
    recordEditorHistory();
    setTokens(items => items.map(token => token.id !== selected.id ? token : {
      ...token,
      classResources: (token.classResources ?? []).map(resource => resource.id !== resourceId ? resource : {
        ...resource, ...patch,
        max: Math.max(0, Math.min(99, patch.max ?? resource.max)),
        used: Math.max(0, Math.min(patch.max ?? resource.max, patch.used ?? resource.used)),
      }),
    }));
  };

  const recoverClassResources = (rest: "short" | "long") => {
    if (!selected || !canEdit || layerLocks.figures) return;
    const recoverable = (selected.classResources ?? []).filter(resource => resource.recovery === rest && resource.used > 0);
    if (!recoverable.length) {
      addLog(selected.name + ": нет потраченных ресурсов для восстановления после " + (rest === "short" ? "короткого" : "длительного") + " отдыха.", "muted");
      return;
    }
    recordEditorHistory();
    setTokens(items => items.map(token => token.id === selected.id ? {
      ...token, classResources: (token.classResources ?? []).map(resource => resource.recovery !== rest ? resource : resource.id === "auto-second-wind" && rest === "short" && (token.classLevel ?? 1) >= 17 ? { ...resource, used: Math.max(0, resource.used - 1) } : { ...resource, used: 0 }),
    } : token));
    addLog(selected.name + ": восстановлены ресурсы класса: " + recoverable.map(resource => resource.name).join(", ") + ".", "gold");
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
    const token: Token = { id: newId(), name: newTokenName.trim(), kind: newTokenKind, x: 25 + Math.random() * 50, y: 25 + Math.random() * 50, hp: newTokenHp, maxHp: newTokenHp, color, initiative: newTokenInitiative, armorClass: newTokenAc, weaponAmmo: {}, loadingUsedWeapons: [] };
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
    const physicalDamage = type === "bludgeoning" || type === "piercing" || type === "slashing";
    const ragingResistance = Boolean(token.raging && physicalDamage);
    const resistant = (token.damageResistances ?? []).includes(type) || ragingResistance;
    const vulnerable = (token.damageVulnerabilities ?? []).includes(type);
    const immune = (token.damageImmunities ?? []).includes(type);
    if (immune) return { amount: 0, note: "иммунитет" };
    if (resistant && vulnerable) return { amount, note: "сопротивление и уязвимость взаимно отменяются" };
    if (resistant) return { amount: Math.floor(amount / 2), note: ragingResistance ? "ярость: сопротивление физическому урону" : "сопротивление: половина урона" };
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
      return { ...token, temporaryHp: nextTemporaryHp, raging: false, deathSaves: token.kind === "hero" ? { successes, failures } : token.deathSaves };
    }
    const nextHp = Math.max(0, token.hp - remaining);
    const overflow = Math.max(0, remaining - token.hp);
    const massiveDamage = nextHp === 0 && overflow >= token.maxHp;
    return {
      ...token,
      hp: nextHp,
      temporaryHp: nextTemporaryHp,
      ...(nextHp === 0 ? { raging: false } : {}),
      ...(token.kind === "hero" ? { deathSaves: massiveDamage ? { successes: 0, failures: 3 } : { successes: 0, failures: 0 } } : {}),
    };
  };

  const resolveConcentrationSave = async (token: Token, damageTaken: number): Promise<Token> => {
    if (!token.concentrating || damageTaken <= 0) return token;
    if (token.hp <= 0) {
      addLog(token.name + ": концентрация прервана из-за потери сознания.", "danger");
      return { ...token, concentrating: false };
    }
    const dc = Math.max(10, Math.floor(damageTaken / 2));
    const abilityModifier = Number(token.abilityModifiers?.constitution ?? 0);
    const proficiencyBonus = token.constitutionSaveProficient ? Number(token.proficiencyBonus ?? 0) : 0;
    const modifier = abilityModifier + proficiencyBonus;
    let roll: number;
    if (remoteEnabled) {
      const result = await apiRequest<{ rolls: number[]; keptRoll: number | null }>("/dice/roll", {
        method: "POST",
        body: JSON.stringify({ count: 1, sides: 20, modifier: 0, mode: "normal" }),
      });
      roll = result.keptRoll ?? result.rolls[0];
    } else {
      roll = Math.floor(Math.random() * 20) + 1;
    }
    const total = roll + modifier;
    const success = total >= dc;
    const updated = success ? token : { ...token, concentrating: false };
    addLog(token.name + ": спасбросок Телосложения для концентрации — " + roll + (modifier >= 0 ? " + " : " - ") + Math.abs(modifier) + " = " + total + " против СЛ " + dc + " — " + (success ? "успех, концентрация сохранена." : "провал, концентрация прервана."), success ? "gold" : "danger");
    return updated;
  };

  const castTrackedSpell = () => {
    if (!selected || !canEdit || layerLocks.figures || !spellName.trim()) return;
    if ((selected.conditions ?? []).includes("incapacitated")) {
      addLog(selected.name + ": недееспособное существо не может накладывать заклинания.", "danger");
      return;
    }
    const resourceLabel = spellResource === "actionUsed" ? "действие" : spellResource === "bonusActionUsed" ? "бонусное действие" : "реакция";
    if (selected[spellResource]) {
      addLog(selected.name + ": " + resourceLabel + " уже использовано.", "danger");
      return;
    }
    const slot = selected.spellSlots?.[spellLevel] ?? { max: 0, used: 0 };
    const pact = selected.pactMagic;
    const castingWithPact = usePactMagic && !!pact && spellLevel > 0 && spellLevel <= pact.level && pact.used < pact.max;
    if (spellLevel > 0 && !castingWithPact && (slot.max <= slot.used)) {
      addLog(selected.name + ": нет доступных ячеек " + spellLevel + "-го уровня.", "danger");
      return;
    }
    recordEditorHistory();
    setTokens(items => items.map(token => token.id === selected.id ? {
      ...token,
      [spellResource]: true,
      ...(spellLevel > 0 && castingWithPact ? { pactMagic: { ...pact!, used: pact!.used + 1 } } : spellLevel > 0 ? { spellSlots: { ...(token.spellSlots ?? {}), [spellLevel]: { ...slot, used: slot.used + 1 } } } : {}),
      ...(spellConcentration ? { concentrating: true } : {}),
    } : token));
    addLog(selected.name + " накладывает «" + spellName.trim() + "» (" + (spellLevel === 0 ? "заговор" : spellLevel + "-й уровень") + "). Потрачено: " + resourceLabel + (spellLevel > 0 ? castingWithPact ? " и ячейка магии договора (" + pact!.level + "-й уровень)" : " и ячейка " + spellLevel + "-го уровня" : "") + (spellConcentration ? "; начата концентрация" : "") + ".", "gold");
    setSpellName("");
  };

  const recoverSpellSlotsAfterLongRest = () => {
    if (!selected || !canEdit || layerLocks.figures) return;
    const slots = selected.spellSlots ?? {};
    const hitDice = selected.hitDice ?? { dieSides: 8, total: 0, used: 0 };
    const spentSlots = Object.values(slots).reduce((total, slot) => total + slot.used, 0) + (selected.pactMagic?.used ?? 0);
    const hitDiceRecovery = hitDice.used > 0 ? Math.max(1, Math.floor(hitDice.total / 2)) : 0;
    const hasChanges = spentSlots > 0 || hitDice.used > 0 || selected.hp < selected.maxHp ||
      (selected.temporaryHp ?? 0) > 0 || (selected.exhaustionLevel ?? 0) > 0 ||
      selected.actionUsed || selected.bonusActionUsed || selected.reactionUsed || selected.concentrating;
    if (!hasChanges) {
      addLog(selected.name + ": длительный отдых не изменил состояние — ресурсы уже восстановлены.", "muted");
      return;
    }
    recordEditorHistory();
    setTokens(items => items.map(token => {
      if (token.id !== selected.id) return token;
      const tokenHitDice = token.hitDice ?? hitDice;
      const recoveredDice = Math.min(tokenHitDice.used, hitDiceRecovery);
      return {
        ...token,
        hp: token.maxHp,
        temporaryHp: 0,
        hitDice: { ...tokenHitDice, used: Math.max(0, tokenHitDice.used - recoveredDice) },
        spellSlots: Object.fromEntries(Object.entries(token.spellSlots ?? {}).map(([level, slot]) => [level, { ...slot, used: 0 }])),
        pactMagic: token.pactMagic ? { ...token.pactMagic, used: 0 } : undefined,
        classResources: (token.classResources ?? []).map(resource => resource.recovery === "manual" ? resource : { ...resource, used: 0 }),
        raging: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        concentrating: false,
        exhaustionLevel: Math.max(0, (token.exhaustionLevel ?? 0) - 1),
        deathSaves: { successes: 0, failures: 0 },
      };
    }));
    addLog(selected.name + ": длительный отдых завершён. Восстановлены все хиты и ячейки; возвращено " + hitDiceRecovery + " костей хитов (фактически: " + Math.min(hitDice.used, hitDiceRecovery) + "); истощение уменьшено на 1, временные хиты и концентрация сброшены.", "gold");
  };

  const updateSpellSlotMaximum = (level: number, maximum: number) => {
    if (!selected || !canEdit || layerLocks.figures) return;
    const current = selected.spellSlots?.[level] ?? { max: 0, used: 0 };
    const max = Math.max(0, Math.min(20, maximum));
    recordEditorHistory();
    setTokens(items => items.map(token => token.id === selected.id ? {
      ...token,
      spellSlots: { ...(token.spellSlots ?? {}), [level]: { max, used: Math.min(current.used, max) } },
    } : token));
  };

  const toggleConcentration = () => {
    if (!selected || !canEdit || layerLocks.figures) return;
    recordEditorHistory();
    const next = !selected.concentrating;
    setTokens(items => items.map(token => token.id === selected.id ? { ...token, concentrating: next } : token));
    addLog(selected.name + (next ? " поддерживает концентрацию." : " прекращает концентрацию."), "muted");
  };

  const toggleConstitutionSaveProficiency = () => {
    if (!selected || !canEdit || layerLocks.figures) return;
    recordEditorHistory();
    const next = !selected.constitutionSaveProficient;
    setTokens(items => items.map(token => token.id === selected.id ? { ...token, constitutionSaveProficient: next } : token));
    addLog(selected.name + (next ? " получает владение спасброском Телосложения." : " теряет владение спасброском Телосложения."), "muted");
  };

  const applyManualDamage = async () => {
    if (!selected || !canEdit || layerLocks.figures) return;
    recordEditorHistory();
    const adjusted = adjustDamageForTraits(selected, hpAdjustment, damageType);
    const damaged = applyDamageToToken(selected, adjusted.amount);
    const updated = await resolveConcentrationSave(damaged, adjusted.amount);
    setTokens(items => items.map(token => token.id === selected.id ? updated : token));
    addLog("Урон " + selected.name + ": " + hpAdjustment + " " + damageType + (adjusted.note ? " (" + adjusted.note + ")" : "") + ". Хиты: " + updated.hp + "/" + updated.maxHp + ".", "danger");
  };

  const useSecondWind = async () => {
    if (!selected || !canEdit || layerLocks.figures || diceBusy || selected.bonusActionUsed || selected.hp <= 0 || selected.hp >= selected.maxHp) return;
    const resource = (selected.classResources ?? []).find(item => item.id === "auto-second-wind");
    if (!resource || resource.used >= resource.max) return;
    setDiceBusy(true);
    try {
      let dieRoll: number;
      if (remoteEnabled) {
        const result = await apiRequest<{ rolls: number[]; total: number }>("/dice/roll", {
          method: "POST",
          body: JSON.stringify({ count: 1, sides: 10, modifier: 0, mode: "normal" }),
        });
        dieRoll = result.rolls[0];
      } else {
        dieRoll = Math.floor(Math.random() * 10) + 1;
      }
      const healing = dieRoll + Math.max(1, selected.classLevel ?? 1);
      const nextHp = Math.min(selected.maxHp, selected.hp + healing);
      recordEditorHistory();
      setTokens(items => items.map(token => token.id !== selected.id ? token : {
        ...token,
        hp: nextHp,
        bonusActionUsed: true,
        classResources: (token.classResources ?? []).map(item => item.id === "auto-second-wind" ? { ...item, used: Math.min(item.max, item.used + 1) } : item),
      }));
      addLog(selected.name + ": «Второе дыхание» — d10 (" + dieRoll + ") + уровень воина (" + (selected.classLevel ?? 1) + "); восстановлено " + (nextHp - selected.hp) + " хитов. Осталось использований: " + (resource.max - resource.used - 1) + ".", "gold");
    } catch (error) {
      addLog("Не удалось выполнить «Второе дыхание»: " + (error instanceof Error ? error.message : "ошибка броска"), "danger");
    } finally {
      setDiceBusy(false);
    }
  };

  const grantBardicInspiration = () => {
    if (!selected || !inspirationTarget || !canEdit || layerLocks.figures || selected.bonusActionUsed || selected.hp <= 0) return;
    const className = (selected.className ?? "").toLocaleLowerCase();
    if (!className.includes("бард") && !className.includes("bard")) return;
    const resource = (selected.classResources ?? []).find(item => item.id === "auto-bardic-inspiration");
    if (!resource || resource.used >= resource.max) {
      addLog(selected.name + ": не осталось использований Вдохновения барда.", "danger");
      return;
    }
    if (inspirationTarget.bardicInspirationDie) {
      addLog(inspirationTarget.name + " уже имеет кость Вдохновения барда.", "muted");
      return;
    }
    const distanceFeet = getGridDistanceFeet(selected, inspirationTarget, battleMapRef.current?.getBoundingClientRect(), room.gridCellSizePx ?? 38);
    if (distanceFeet !== null && distanceFeet > 60) {
      addLog(inspirationTarget.name + " находится дальше 60 футов — Вдохновение барда не передано.", "danger");
      return;
    }
    const level = selected.classLevel ?? 1;
    const die = level >= 15 ? 12 : level >= 10 ? 10 : level >= 5 ? 8 : 6;
    recordEditorHistory();
    setTokens(items => items.map(token => {
      if (token.id === selected.id) return {
        ...token,
        bonusActionUsed: true,
        classResources: (token.classResources ?? []).map(item => item.id === "auto-bardic-inspiration" ? { ...item, used: Math.min(item.max, item.used + 1) } : item),
      };
      if (token.id === inspirationTarget.id) return { ...token, bardicInspirationDie: die, bardicInspirationSource: selected.name };
      return token;
    }));
    addLog(selected.name + " вдохновляет " + inspirationTarget.name + ": передана кость d" + die + ". Она добавляется к одной проверке характеристики, атаке или спасброску по выбору получателя.", "gold");
  };

  const useRage = () => {
    if (!selected || !canEdit || layerLocks.figures || selected.bonusActionUsed || selected.hp <= 0 || selected.raging) return;
    const resource = (selected.classResources ?? []).find(item => item.id === "auto-rage");
    if (!resource || resource.used >= resource.max) return;
    recordEditorHistory();
    setTokens(items => items.map(token => token.id !== selected.id ? token : {
      ...token,
      raging: true,
      bonusActionUsed: true,
      classResources: (token.classResources ?? []).map(item => item.id === "auto-rage" ? { ...item, used: Math.min(item.max, item.used + 1) } : item),
    }));
    const level = selected.classLevel ?? 1;
    addLog(selected.name + ": начинает ярость. Сопротивление дробящему, колющему и рубящему урону; дополнительный урон рукопашными атаками Силой +" + (level >= 16 ? 4 : level >= 9 ? 3 : 2) + ".", "gold");
  };

  const endRage = () => {
    if (!selected || !canEdit || layerLocks.figures || !selected.raging) return;
    recordEditorHistory();
    setTokens(items => items.map(token => token.id === selected.id ? { ...token, raging: false } : token));
    addLog(selected.name + ": ярость завершена.", "muted");
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

  const spendHitDieDuringShortRest = async () => {
    if (!selected || selected.kind !== "hero" || !canEdit || layerLocks.figures || diceBusy) return;
    const hitDice = selected.hitDice ?? { dieSides: 8, total: 0, used: 0 };
    if (hitDice.used >= hitDice.total) {
      addLog(selected.name + ": не осталось доступных костей хитов.", "danger");
      return;
    }
    if (selected.hp >= selected.maxHp) {
      addLog(selected.name + ": хиты уже полностью восстановлены.", "muted");
      return;
    }
    setDiceBusy(true);
    try {
      let dieRoll: number;
      if (remoteEnabled) {
        const result = await apiRequest<{ rolls: number[]; total: number }>("/dice/roll", {
          method: "POST",
          body: JSON.stringify({ count: 1, sides: hitDice.dieSides, modifier: 0, mode: "normal" }),
        });
        dieRoll = result.rolls[0];
      } else {
        dieRoll = Math.floor(Math.random() * hitDice.dieSides) + 1;
      }
      const constitutionModifier = Number(selected.abilityModifiers?.constitution ?? 0);
      const healing = Math.max(0, dieRoll + constitutionModifier);
      const nextHp = Math.min(selected.maxHp, selected.hp + healing);
      recordEditorHistory();
      setTokens(items => items.map(token => token.id === selected.id ? {
        ...token,
        hp: nextHp,
        hitDice: { ...(token.hitDice ?? hitDice), used: Math.min((token.hitDice ?? hitDice).total, (token.hitDice ?? hitDice).used + 1) },
        ...(nextHp > 0 ? { deathSaves: { successes: 0, failures: 0 } } : {}),
      } : token));
      addLog(selected.name + ": короткий отдых — потрачена 1 кость хитов (d" + hitDice.dieSides + "), бросок " + dieRoll + (constitutionModifier >= 0 ? " + " : " - ") + Math.abs(constitutionModifier) + "; восстановлено " + (nextHp - selected.hp) + " хитов. Осталось костей: " + (hitDice.total - hitDice.used - 1) + ".", "gold");
    } catch (error) {
      setTableError(error instanceof Error ? error.message : "Не удалось бросить кость хитов.");
    } finally {
      setDiceBusy(false);
    }
  };

  const updateHitDice = (field: "dieSides" | "total", value: number) => {
    if (!selected || !canEdit || layerLocks.figures) return;
    const current = selected.hitDice ?? { dieSides: 8, total: 0, used: 0 };
    const nextValue = field === "dieSides" ? ([4,6,8,10,12,20].includes(value) ? value : 8) : Math.max(0, Math.min(20, value));
    const updated = { ...current, [field]: nextValue, used: field === "total" ? Math.min(current.used, nextValue) : current.used };
    recordEditorHistory();
    setTokens(items => items.map(token => token.id === selected.id ? { ...token, hitDice: updated } : token));
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

  const resetWeaponLoading = () => {
    if (!selected || !selectedWeapon || !canEdit || layerLocks.figures) return;
    recordEditorHistory();
    setTokens(items => items.map(token => token.id === selected.id
      ? { ...token, loadingUsedWeapons: (token.loadingUsedWeapons ?? []).filter(id => id !== selectedWeapon.id) }
      : token));
    addLog(selected.name + ": перезарядка «" + selectedWeapon.name + "» сброшена для дополнительного действия или реакции.", "gold");
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
    if (rollKind === "attack" && (selected.conditions ?? []).includes("incapacitated")) {
      addLog(selected.name + ": недееспособное существо не может атаковать.", "danger");
      return;
    }
    if (rollKind === "attack" && attackResource !== "actionUsed" && selected[attackResource]) {
      const resourceLabel = attackResource === "bonusActionUsed" ? "бонусное действие" : "реакцию";
      addLog(selected.name + ": " + resourceLabel + " уже использовано в этом раунде.", "danger");
      return;
    }
    const weaponUsesAmmo = rollKind === "attack" && (selectedWeapon?.properties.includes("ammunition") ?? false);
    const weaponUsesLoading = rollKind === "attack" && (selectedWeapon?.properties.includes("loading") ?? false);
    const weaponAmmoCount = selectedWeapon ? selected.weaponAmmo?.[selectedWeapon.id] ?? 0 : 0;
    if (weaponUsesAmmo && weaponAmmoCount <= 0) {
      addLog(selected.name + ": нет боеприпасов для " + selectedWeapon?.name + ".", "danger");
      return;
    }
    if (weaponUsesLoading && selectedWeapon && (selected.loadingUsedWeapons ?? []).includes(selectedWeapon.id)) {
      addLog(selected.name + ": оружие «" + selectedWeapon.name + "» уже использовало свойство «Перезарядка» в этом ходу.", "danger");
      return;
    }
    let finalRollMode = selectedRollMode;
    if (rollKind === "attack" && attackTarget) {
      const distanceFeet = getGridDistanceFeet(selected, attackTarget, battleMapRef.current?.getBoundingClientRect(), room.gridCellSizePx ?? 38);
      if (distanceFeet !== null) {
        if (attackType === "melee") {
          const reach = selectedWeapon?.properties.includes("reach") ? 10 : 5;
          if (distanceFeet > reach) {
            addLog("Цель вне досягаемости: " + distanceFeet + " фт. Максимум для этой атаки: " + reach + " фт.", "danger");
            return;
          }
        } else {
          const normalRange = selectedWeapon?.rangeFt?.normal ?? 30;
          const longRange = selectedWeapon?.rangeFt?.long ?? normalRange;
          if (distanceFeet > longRange) {
            addLog("Цель вне максимальной дальности: " + distanceFeet + " фт. Максимум: " + longRange + " фт.", "danger");
            return;
          }
          const rangeDisadvantage = distanceFeet > normalRange || distanceFeet <= 5;
          if (rollModeOverride === "auto") {
            finalRollMode = resolveRollMode({
              advantage: attackerRollFlags.advantage || targetRollFlags.advantage,
              disadvantage: attackerRollFlags.disadvantage || targetRollFlags.disadvantage || rangeDisadvantage,
            });
          }
        }
      }
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
          { method: "POST", body: JSON.stringify({ count: 1, sides: 20, modifier: effectiveRollModifier, mode: finalRollMode }) },
        );
        rolls = result.rolls;
        kept = result.keptRoll ?? rolls[0];
        total = result.total;
      } else {
        rolls = finalRollMode === "normal"
          ? [Math.floor(Math.random() * 20) + 1]
          : [Math.floor(Math.random() * 20) + 1, Math.floor(Math.random() * 20) + 1];
        kept = finalRollMode === "advantage" ? Math.max(...rolls) : finalRollMode === "disadvantage" ? Math.min(...rolls) : rolls[0];
        total = kept + effectiveRollModifier;
      }

      if (rollKind === "attack") setUseSneakAttack(false);

      if (rollKind === "attack" && selectedWeapon && (weaponUsesAmmo || weaponUsesLoading)) {
        recordEditorHistory();
        setTokens(items => items.map(token => token.id === selected.id ? {
          ...token,
          ...(weaponUsesAmmo ? { weaponAmmo: { ...(token.weaponAmmo ?? {}), [selectedWeapon.id]: Math.max(0, weaponAmmoCount - 1) } } : {}),
          ...(weaponUsesLoading ? { loadingUsedWeapons: [...new Set([...(token.loadingUsedWeapons ?? []), selectedWeapon.id])] } : {}),
        } : token));
      }

      let inspirationRoll: number | null = null;
      const inspirationDie = selected.bardicInspirationDie;
      if (useBardicInspiration && inspirationDie) {
        if (remoteEnabled) {
          const inspirationResult = await apiRequest<{ rolls: number[]; total: number }>("/dice/roll", {
            method: "POST",
            body: JSON.stringify({ count: 1, sides: inspirationDie, modifier: 0, mode: "normal" }),
          });
          inspirationRoll = inspirationResult.rolls[0];
        } else {
          inspirationRoll = Math.floor(Math.random() * inspirationDie) + 1;
        }
        total += inspirationRoll;
        recordEditorHistory();
        setTokens(items => items.map(token => token.id === selected.id ? { ...token, bardicInspirationDie: undefined, bardicInspirationSource: undefined } : token));
        setUseBardicInspiration(false);
      }

      if (rollKind !== "attack") {
        addLog(selected.name + ": " + checkLabel + " — " + rolls.join(" / ") + " (" + (finalRollMode === "advantage" ? "преимущество" : finalRollMode === "disadvantage" ? "помеха" : "обычный бросок") + ", выбрано " + kept + ") " + modifierText + (inspirationRoll !== null ? " + Вдохновение d" + inspirationDie + " (" + inspirationRoll + ")" : "") + " = " + total + ".", "muted");
        return;
      }

      const resourceLabels = { actionUsed: "действие", bonusActionUsed: "бонусное действие", reactionUsed: "реакция" };
      if (!selected[attackResource]) {
        recordEditorHistory();
        setTokens(items => items.map(token => token.id === selected.id ? { ...token, [attackResource]: true } : token));
        addLog(selected.name + ": потрачено " + resourceLabels[attackResource] + " на атаку." + (attackResource === "actionUsed" ? " Дополнительные атаки в рамках того же действия остаются возможны." : ""), "muted");
      }

      const target = attackTarget!;
      const targetAc = Math.max(0, Number(target.armorClass ?? 10));
      const critical = kept === 20 || (attackType === "melee" && (target.conditions ?? []).some(condition => condition === "paralyzed" || condition === "unconscious"));
      const naturalOne = kept === 1;
      const hit = !naturalOne && (critical || total >= targetAc);
      addLog(
        selected.name + " атакует " + target.name + " (" + (selectedWeapon?.name ?? "оружие") + "): " + rolls.join(" / ") + " (" + (finalRollMode === "advantage" ? "преимущество" : finalRollMode === "disadvantage" ? "помеха" : "обычный бросок") + ", выбрано " + kept + ") " + modifierText + (inspirationRoll !== null ? " + Вдохновение d" + inspirationDie + " (" + inspirationRoll + ")" : "") + " = " + total + " против КД " + targetAc + " — " + (hit ? (critical ? "критическое попадание" : "попадание") : "промах") + ".",
        hit ? "gold" : "danger",
      );
      if (!hit) return;

      const parsed = parseDamageFormula(damageFormula);
      if (!parsed) {
        addLog("Попадание подтверждено, но формула урона некорректна. Формат: 1d8+3 (от 1 до 10 костей).", "danger");
        return;
      }
      const rogueClass = (selected.className ?? "").toLocaleLowerCase();
      const isRogue = rogueClass.includes("плут") || rogueClass.includes("rogue");
      const sneakAttackTurnKey = `${round}:${activeTokenId ?? selected.id}`;
      const allyNearTarget = tokens.some(token => token.id !== selected.id && token.id !== target.id && (target.kind === "enemy" ? token.kind !== "enemy" : token.kind === "enemy")
        && getGridDistanceFeet(token, target, battleMapRef.current?.getBoundingClientRect(), room.gridCellSizePx ?? 38) !== null
        && (getGridDistanceFeet(token, target, battleMapRef.current?.getBoundingClientRect(), room.gridCellSizePx ?? 38) ?? Infinity) <= 5);
      const sneakAttackWeaponEligible = Boolean(selectedWeapon && (selectedWeapon.kind === "ranged" || selectedWeapon.properties.includes("finesse")));
      const sneakAttackEligible = isRogue && sneakAttackWeaponEligible && finalRollMode !== "disadvantage"
        && (finalRollMode === "advantage" || allyNearTarget)
        && selected.sneakAttackUsedTurnKey !== sneakAttackTurnKey;
      let sneakAttackRolls: number[] = [];
      let sneakAttackDamage = 0;
      if (useSneakAttack && sneakAttackEligible) {
        const sneakDice = Math.ceil((selected.classLevel ?? 1) / 2) * (critical ? 2 : 1);
        if (remoteEnabled) {
          const sneakResult = await apiRequest<{ rolls: number[]; total: number }>("/dice/roll", {
            method: "POST",
            body: JSON.stringify({ count: sneakDice, sides: 6, modifier: 0, mode: "normal" }),
          });
          sneakAttackRolls = sneakResult.rolls;
          sneakAttackDamage = sneakResult.total;
        } else {
          sneakAttackRolls = Array.from({ length: sneakDice }, () => Math.floor(Math.random() * 6) + 1);
          sneakAttackDamage = sneakAttackRolls.reduce((sum, value) => sum + value, 0);
        }
        recordEditorHistory();
        setTokens(items => items.map(token => token.id === selected.id ? { ...token, sneakAttackUsedTurnKey: sneakAttackTurnKey } : token));
        setUseSneakAttack(false);
      } else if (useSneakAttack && !sneakAttackEligible) {
        addLog("Скрытая атака не применена: проверь оружие, преимущество/союзника рядом с целью и доступность умения в этом ходу.", "muted");
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
      const rageLevel = selected.classLevel ?? 1;
      const rageBonus = selected.raging && attackType === "melee" && attackAbility === "strength"
        ? (rageLevel >= 16 ? 4 : rageLevel >= 9 ? 3 : 2)
        : 0;
      damageTotal = Math.max(0, damageTotal + rageBonus + sneakAttackDamage);
      const adjustedDamage = adjustDamageForTraits(target, damageTotal, damageType);
      const appliedDamage = adjustedDamage.amount;
      recordEditorHistory();
      const damagedTarget = applyDamageToToken(target, appliedDamage, critical);
      const updatedTarget = await resolveConcentrationSave(damagedTarget, appliedDamage);
      setTokens(items => items.map(token => token.id === target.id ? updatedTarget : token));
      const damageExpression = parsed.flatDamage !== undefined
        ? String(parsed.flatDamage)
        : damageRolls.join(" + ") + (parsed.modifier ? (parsed.modifier > 0 ? " + " : " - ") + Math.abs(parsed.modifier) : "");
      addLog(
        "Урон " + target.name + " (" + damageType + "): " + damageExpression + (sneakAttackRolls.length ? " + Скрытая атака " + sneakAttackRolls.join(" + ") : "") + (rageBonus ? " + ярость " + rageBonus : "") + " = " + damageTotal + (adjustedDamage.note ? " (" + adjustedDamage.note + ")" : "") + (critical ? (parsed.flatDamage !== undefined ? " (критическое попадание)" : " (критический урон: кости удвоены)") : "") + ". Хиты: " + updatedTarget.hp + "/" + updatedTarget.maxHp + (updatedTarget.temporaryHp ? ", временные хиты: " + updatedTarget.temporaryHp : "") + ".",
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
      setTokens(items => items.map(token => token.id === first.id ? { ...token, loadingUsedWeapons: [], actionUsed: false, bonusActionUsed: false, reactionUsed: false } : token));
      setRound(value => value + 1);
      addLog(`Раунд ${round + 1}: ход ${first.name}.`, "gold");
    } else {
      const next = initiative[nextIndex];
      setActiveTokenId(next.id);
      setTokens(items => items.map(token => token.id === next.id ? { ...token, loadingUsedWeapons: [], actionUsed: false, bonusActionUsed: false, reactionUsed: false } : token));
      addLog(`Ход переходит к ${next.name}.`, "gold");
    }
  };
  const previousTurn = () => {
    if (!canEdit || !initiative.length) return;
    const currentIndex = initiative.findIndex(token => token.id === activeToken?.id);
    const previousIndex = currentIndex <= 0 ? initiative.length - 1 : currentIndex - 1;
    const previous = initiative[previousIndex];
    if (!previous) return;
    setActiveTokenId(previous.id);
    setTokens(items => items.map(token => token.id === previous.id ? { ...token, loadingUsedWeapons: [] } : token));
    if (currentIndex <= 0) {
      setRound(value => Math.max(1, value - 1));
      addLog(`Возврат к предыдущему раунду: ход ${previous.name}.`, "muted");
    } else {
      addLog(`Ход возвращён к ${previous.name}.`, "muted");
    }
  };

  const resetInitiative = () => {
    if (!canEdit || !initiative.length) return;
    const first = initiative[0];
    setRound(1);
    setActiveTokenId(first.id);
    setTokens(items => items.map(token => ({ ...token, loadingUsedWeapons: [], sneakAttackUsedTurnKey: undefined, actionUsed: false, bonusActionUsed: false, reactionUsed: false })));
    addLog(`Инициатива сброшена. Раунд 1: ход ${first.name}.`, "gold");
  };

  const toggleCombatResource = (resource: "actionUsed" | "bonusActionUsed" | "reactionUsed") => {
    if (!selected || !canEdit || layerLocks.figures) return;
    if ((selected.conditions ?? []).includes("incapacitated")) {
      addLog(selected.name + " недееспособен и не может использовать действия или реакции.", "danger");
      return;
    }
    const next = !selected[resource];
    setTokens(items => items.map(token => token.id === selected.id ? { ...token, [resource]: next } : token));
    const labels = { actionUsed: "Действие", bonusActionUsed: "Бонусное действие", reactionUsed: "Реакция" };
    addLog(selected.name + ": " + labels[resource] + (next ? " использовано." : " снова доступно."), next ? "muted" : "gold");
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
      ? { ...token, conditions: [...(token.conditions ?? []), conditionId], ...(conditionId === "incapacitated" || conditionId === "unconscious" ? { raging: false } : {}) }
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
  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = message.trim();
    if (!content || chatBusy) return;
    if (remoteEnabled && campaignId) {
      setChatBusy(true);
      setChatError("");
      try {
        const created = await apiRequest<TableChatMessage>(`/campaigns/${campaignId}/table/messages`, {
          method: "POST",
          body: JSON.stringify({ content }),
        });
        setChatMessages(items => [...items.filter(item => item.id !== created.id), created].slice(-100));
        chatCursorRef.current = created.id;
        setMessage("");
      } catch (error) {
        setChatError(error instanceof Error ? error.message : "Не удалось отправить сообщение.");
      } finally {
        setChatBusy(false);
      }
      return;
    }
    const localMessage: TableChatMessage = {
      id: newId(),
      content,
      createdAt: new Date().toISOString(),
      author: { username: "Гость" },
    };
    const nextMessages = [...chatMessages, localMessage].slice(-100);
    setChatMessages(nextMessages);
    if (campaignId) {
      try { window.localStorage.setItem(localChatKey(campaignId), JSON.stringify(nextMessages)); } catch { /* Local chat remains available until the page closes. */ }
    }
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
          <div ref={battleMapRef} className={`battle-map map-${room.mapTheme} ${room.grid ? "with-grid" : ""} ${mapAsset && layerVisibility.background ? "has-uploaded-map" : ""}`} style={{ "--grid-cell-size": `${room.gridCellSizePx ?? 38}px`, "--scaled-grid-cell-size": `${(room.gridCellSizePx ?? 38) * zoom / 100}px`, "--map-zoom": zoom / 100, "--map-image-scale": mapView.scale, "--map-offset-x": `${mapView.x}%`, "--map-offset-y": `${mapView.y}%` } as React.CSSProperties} onPointerMove={moveToken} onPointerUp={() => { setDraggingId(null); finishHistoryGroup(); }} onPointerLeave={() => { setDraggingId(null); finishHistoryGroup(); }}>
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
            <div className="initiative-turn-controls">
              <button className="button button-secondary" type="button" onClick={previousTurn} disabled={!canEdit || !initiative.length} aria-label="Предыдущий ход">Назад</button>
              <button className="button button-primary next-turn" type="button" onClick={nextTurn} disabled={!canEdit || !initiative.length}>Следующий ход <ChevronRight size={16}/></button>
              <button className="button button-secondary" type="button" onClick={resetInitiative} disabled={!canEdit || !initiative.length} title="Вернуть инициативу к первому участнику и первому раунду">Сброс</button>
            </div>
          </section>
          {selected && <section className="table-panel selected-panel">
            <div className="table-panel-title"><div><Shield size={16}/><strong>Выбранная фигура</strong></div></div>
            <div className="selected-token-title"><span className={`initiative-avatar token-${selected.color}`}>{selected.kind === "enemy" ? "!" : "♟"}</span><div><strong>{selected.name}</strong><small>{selected.kind === "enemy" ? "Противник" : "Союзник"}</small></div></div>
            <div className="combat-economy">
              <div className="combat-economy-heading"><strong>Ресурсы хода</strong><small>{activeToken?.id === selected.id ? "Сейчас ход этой фигуры" : "Не активный ход"}</small></div>
              <div className="combat-economy-buttons">
                <button type="button" className={selected.actionUsed ? "resource-used" : ""} onClick={() => toggleCombatResource("actionUsed")} disabled={!canEdit || layerLocks.figures || (selected.conditions ?? []).includes("incapacitated")}>{selected.actionUsed ? "Действие: использовано" : "Действие: доступно"}</button>
                <button type="button" className={selected.bonusActionUsed ? "resource-used" : ""} onClick={() => toggleCombatResource("bonusActionUsed")} disabled={!canEdit || layerLocks.figures || (selected.conditions ?? []).includes("incapacitated")}>{selected.bonusActionUsed ? "Бонус: использовано" : "Бонус: доступно"}</button>
                <button type="button" className={selected.reactionUsed ? "resource-used" : ""} onClick={() => toggleCombatResource("reactionUsed")} disabled={!canEdit || layerLocks.figures || (selected.conditions ?? []).includes("incapacitated")}>{selected.reactionUsed ? "Реакция: использована" : "Реакция: доступна"}</button>
              </div>
            </div>
            <div className="combat-economy">
              <div className="combat-economy-heading"><strong>Спасбросок Телосложения</strong><small>{selected.constitutionSaveProficient ? "С владением" : "Без владения"}</small></div>
              <div className="combat-economy-buttons">
                <button type="button" className={selected.constitutionSaveProficient ? "resource-used" : ""} onClick={toggleConstitutionSaveProficiency} disabled={!canEdit || layerLocks.figures}>{selected.constitutionSaveProficient ? "Владение включено" : "Нет владения"}</button>
              </div>
            </div>
            <div className="combat-economy">
              <div className="combat-economy-heading"><strong>Концентрация</strong><small>{selected.concentrating ? "Заклинание поддерживается" : "Не активна"}</small></div>
              <div className="combat-economy-buttons">
                <button type="button" className={selected.concentrating ? "resource-used" : ""} onClick={toggleConcentration} disabled={!canEdit || layerLocks.figures || selected.hp <= 0}>{selected.concentrating ? "Прекратить концентрацию" : "Начать концентрацию"}</button>
              </div>
              <small>При получении урона автоматически выполняется спасбросок Телосложения (СЛ 10 или половина урона, если больше).</small>
            </div>
            <div className="hp-line"><span>Хиты</span><b>{selected.hp} / {selected.maxHp}{(selected.temporaryHp ?? 0) > 0 ? ` · +${selected.temporaryHp} врем.` : ""}</b></div><div className="hp-track"><i style={{ width: `${(selected.hp / selected.maxHp) * 100}%` }}/></div>
            {selected.kind === "hero" && <div className="short-rest-panel">
              <strong>Кости хитов и короткий отдых</strong>
              <div className="combat-roll-row">
                <label>Кость<select value={selected.hitDice?.dieSides ?? 8} onChange={event => updateHitDice("dieSides", Number(event.target.value))} disabled={!canEdit || layerLocks.figures}>
                  {[4,6,8,10,12,20].map(sides=><option key={sides} value={sides}>d{sides}</option>)}
                </select></label>
                <label>Всего<input type="number" min="0" max="20" value={selected.hitDice?.total ?? 0} onChange={event => updateHitDice("total", Number(event.target.value)||0)} disabled={!canEdit || layerLocks.figures}/></label>
              </div>
              <span>Доступно: {Math.max(0,(selected.hitDice?.total ?? 0)-(selected.hitDice?.used ?? 0))} / {selected.hitDice?.total ?? 0}</span>
              <button type="button" className="secondary-button" onClick={() => {
                  if (!selected || !canEdit || layerLocks.figures) return;
                  recordEditorHistory();
                  setTokens(items => items.map(token => token.id === selected.id ? { ...token, pactMagic: token.pactMagic ? { ...token.pactMagic, used: 0 } : undefined } : token));
                  recoverClassResources("short");
                  addLog(selected.name + ": ячейки магии договора восстановлены после короткого отдыха.", "gold");
                }} disabled={!canEdit || layerLocks.figures}>Завершить короткий отдых (магия договора и ресурсы)</button>
               <button type="button" onClick={spendHitDieDuringShortRest} disabled={!canEdit || layerLocks.figures || diceBusy || (selected.hitDice?.used ?? 0) >= (selected.hitDice?.total ?? 0) || selected.hp >= selected.maxHp}>
                {diceBusy ? "Бросок…" : "Потратить кость хитов"}
              </button>
              <small>За один бросок тратится одна кость. Можно повторять во время короткого отдыха, пока остаются кости и не восстановлены все хиты.</small>
            </div>}
            {(selected.classResources ?? []).some(resource => resource.id === "auto-rage") && <div className="combat-economy">
              <div className="combat-economy-heading"><strong>Ярость</strong><small>{selected.raging ? "Активна" : Math.max(0, ((selected.classResources ?? []).find(resource => resource.id === "auto-rage")?.max ?? 0) - ((selected.classResources ?? []).find(resource => resource.id === "auto-rage")?.used ?? 0)) + " использований доступно"}</small></div>
              {selected.raging ? <button type="button" className="secondary-button" onClick={endRage} disabled={!canEdit || layerLocks.figures}>Завершить ярость</button> : <button type="button" className="secondary-button" onClick={useRage} disabled={!canEdit || layerLocks.figures || selected.bonusActionUsed || selected.hp <= 0 || ((selected.classResources ?? []).find(resource => resource.id === "auto-rage")?.used ?? 0) >= ((selected.classResources ?? []).find(resource => resource.id === "auto-rage")?.max ?? 0)}>Начать ярость (бонусное действие)</button>}
              <small>Пока ярость активна: сопротивление дробящему, колющему и рубящему урону; дополнительный урон рукопашным атакам Силой: +{(selected.classLevel ?? 1) >= 16 ? 4 : (selected.classLevel ?? 1) >= 9 ? 3 : 2}. Завершай ярость вручную по окончании её действия.</small>
            </div>}
            {(selected.classResources ?? []).some(resource => resource.id === "auto-second-wind") && <div className="combat-economy">
              <div className="combat-economy-heading"><strong>Второе дыхание</strong><small>{Math.max(0, ((selected.classResources ?? []).find(resource => resource.id === "auto-second-wind")?.max ?? 0) - ((selected.classResources ?? []).find(resource => resource.id === "auto-second-wind")?.used ?? 0))} использований доступно</small></div>
              <button type="button" className="secondary-button" onClick={useSecondWind} disabled={!canEdit || layerLocks.figures || diceBusy || selected.bonusActionUsed || selected.hp <= 0 || selected.hp >= selected.maxHp || ((selected.classResources ?? []).find(resource => resource.id === "auto-second-wind")?.used ?? 0) >= ((selected.classResources ?? []).find(resource => resource.id === "auto-second-wind")?.max ?? 0)}>{diceBusy ? "Бросок…" : "Использовать Второе дыхание (d10 + уровень воина)"}</button>
              <small>Бонусное действие. После короткого отдыха на 17-м уровне и выше возвращается одно потраченное использование.</small>
            </div>}
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
                <label>Расход ресурса<select value={attackResource} onChange={event => setAttackResource(event.target.value as typeof attackResource)} disabled={!canEdit}>
                  <option value="actionUsed">Действие</option>
                  <option value="bonusActionUsed">Бонусное действие</option>
                  <option value="reactionUsed">Реакция</option>
                </select></label>
                <label>Оружие<select value={selectedWeaponId} onChange={event => selectWeapon(event.target.value)} disabled={!canEdit}>
                  {weaponOptions.map(weapon => <option key={weapon.id} value={weapon.id}>{weapon.name} · {weapon.damage} · {damageTypeOptions.find(type => type.id === weapon.damageType)?.label ?? ""}{weapon.rangeFt ? " · " + weapon.rangeFt.normal + "/" + weapon.rangeFt.long + " фт." : ""}</option>)}
                </select></label>
                <label>Цель<select value={attackTarget?.id ?? ""} onChange={event => setAttackTargetId(event.target.value)} disabled={!canEdit || attackTargets.length === 0}>
                  {attackTargets.map(token => <option key={token.id} value={token.id}>{token.name} · КД {token.armorClass ?? 10}</option>)}
                </select></label>
                {selectedWeapon?.versatileDamage && <label className="weapon-proficiency-toggle"><input type="checkbox" checked={useVersatileDamage} onChange={event => toggleVersatileDamage(event.target.checked)} disabled={!canEdit}/> Двумя руками ({selectedWeapon.versatileDamage})</label>}
                {selectedWeapon?.properties.includes("ammunition") && <label className="ammo-count-control">Боеприпасы<input type="number" min="0" max="999" value={selected?.weaponAmmo?.[selectedWeapon.id] ?? 0} onFocus={beginHistoryGroup} onBlur={finishHistoryGroup} onChange={event => {
                  const value = Math.max(0, Math.min(999, Number(event.target.value) || 0));
                  if (!selected) return;
                  setTokens(items => items.map(token => token.id === selected.id ? { ...token, weaponAmmo: { ...(token.weaponAmmo ?? {}), [selectedWeapon.id]: value } } : token));
                }} disabled={!canEdit || layerLocks.figures}/></label>}
                {selectedWeapon?.properties.includes("loading") && <div className="weapon-loading-note"><small>{(selected?.loadingUsedWeapons ?? []).includes(selectedWeapon.id) ? "Перезарядка использована в этом ходу." : "Свойство «Перезарядка»: один выстрел за действие."}</small>{(selected?.loadingUsedWeapons ?? []).includes(selectedWeapon.id) && <button type="button" onClick={resetWeaponLoading} disabled={!canEdit || layerLocks.figures}>Сбросить для дополнительного действия</button>}</div>}
                <label>Вид атаки<select value={attackType} onChange={event => setAttackType(event.target.value as "melee" | "ranged")} disabled={!canEdit}>
                  <option value="melee" disabled={selectedWeapon?.kind === "ranged"}>Ближний бой</option><option value="ranged" disabled={selectedWeapon?.kind === "melee" && !selectedWeapon?.properties.includes("thrown")}>Дальний бой</option>
                </select></label>
                <label>Характеристика<select value={attackAbility} onChange={event => setAttackAbility(event.target.value as AbilityId)} disabled={!canEdit || !selectedWeapon?.properties.includes("finesse")}>
                  {selectedWeapon?.properties.includes("finesse")
                    ? <><option value="strength">Сила</option><option value="dexterity">Ловкость</option></>
                    : <option value={selectedWeapon?.kind === "ranged" ? "dexterity" : "strength"}>{selectedWeapon?.kind === "ranged" ? "Ловкость" : "Сила"}</option>}
                </select></label>
                <label className="weapon-proficiency-toggle"><input type="checkbox" checked={useWeaponProficiency} onChange={event => setUseWeaponProficiency(event.target.checked)} disabled={!canEdit}/> Владение оружием (+{selected?.proficiencyBonus ?? 0})</label>
                {(selected?.className ?? "").toLocaleLowerCase().match(/плут|rogue/) && <label className="weapon-proficiency-toggle"><input type="checkbox" checked={useSneakAttack} onChange={event => setUseSneakAttack(event.target.checked)} disabled={!canEdit || diceBusy || Boolean(selected?.sneakAttackUsedTurnKey === `${round}:${activeTokenId ?? selected.id}`)}/> Применить Скрытую атаку ({Math.ceil((selected?.classLevel ?? 1) / 2)}d6 при попадании)</label>}
                <span className="attack-bonus-preview">Бонус атаки: {effectiveRollModifier >= 0 ? "+" : ""}{effectiveRollModifier}</span>
                <label>Урон<input value={damageFormula} onChange={event => setDamageFormula(event.target.value)} placeholder="1d8+3" disabled={!canEdit} aria-label="Формула урона"/></label>
              </div>}
              <select className="combat-roll-mode" value={rollModeOverride} onChange={event => setRollModeOverride(event.target.value as RollModeOverride)} disabled={!canEdit}>
                <option value="auto">Автоматически по состояниям</option><option value="normal">Обычный бросок</option><option value="advantage">Преимущество</option><option value="disadvantage">Помеха</option>
              </select>
              <span className={selectedRollBlocked || selectedSaveAutoFail ? "combat-roll-warning" : "combat-roll-hint"}>
                {selectedRollBlocked ? selectedRollBlockReason : selectedSaveAutoFail ? selectedSaveFailReason : `Режим: ${selectedRollModeLabel.toLowerCase()}.`}
              </span>
              {selected.bardicInspirationDie && <label className="combat-roll-hint"><input type="checkbox" checked={useBardicInspiration} onChange={event => setUseBardicInspiration(event.target.checked)} disabled={!canEdit || diceBusy}/> Добавить моё Вдохновение d{selected.bardicInspirationDie} к этому броску</label>}
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
            <section className="spellcasting-panel class-resource-panel">
              <strong>Ресурсы класса и подкласса</strong>
              {(selected.classResources ?? []).some(resource => resource.id === "auto-bardic-inspiration") && <div className="combat-economy">
                <div className="combat-economy-heading"><strong>Вдохновение барда</strong><small>{Math.max(0, ((selected.classResources ?? []).find(resource => resource.id === "auto-bardic-inspiration")?.max ?? 0) - ((selected.classResources ?? []).find(resource => resource.id === "auto-bardic-inspiration")?.used ?? 0))} использований доступно</small></div>
                <label>Союзник<select value={inspirationTarget?.id ?? ""} onChange={event => setInspirationTargetId(event.target.value)} disabled={!canEdit || layerLocks.figures || selected.bonusActionUsed}>
                  {inspirationTargets.map(token => <option key={token.id} value={token.id}>{token.name}{token.bardicInspirationDie ? " (уже вдохновлён)" : ""}</option>)}
                </select></label>
                <button type="button" className="secondary-button" onClick={grantBardicInspiration} disabled={!canEdit || layerLocks.figures || selected.bonusActionUsed || selected.hp <= 0 || !inspirationTarget || inspirationTarget.bardicInspirationDie !== undefined || ((selected.classResources ?? []).find(resource => resource.id === "auto-bardic-inspiration")?.used ?? 0) >= ((selected.classResources ?? []).find(resource => resource.id === "auto-bardic-inspiration")?.max ?? 0)}>Передать Вдохновение (бонусное действие)</button>
                <small>Кость: d{(selected.classLevel ?? 1) >= 15 ? 12 : (selected.classLevel ?? 1) >= 10 ? 10 : (selected.classLevel ?? 1) >= 5 ? 8 : 6}. Дальность — 60 футов. Вдохновение восстанавливается после короткого отдыха с 5-го уровня барда.</small>
              </div>}

              {(selected.classResources ?? []).length ? (selected.classResources ?? []).map(resource => <div className="spell-slot-row" key={resource.id}>
                <span><b>{resource.name}</b> · доступно {Math.max(0, resource.max - resource.used)} / {resource.max}</span>
                <small>Восстановление: {resource.recovery === "short" ? "короткий отдых" : resource.recovery === "long" ? "длительный отдых" : "вручную"}</small>
                <div className="combat-roll-buttons">
                  <button type="button" onClick={() => updateClassResource(resource.id, { used: resource.used - 1 })} disabled={!canEdit || layerLocks.figures || resource.used <= 0}>−</button>
                  <button type="button" onClick={() => updateClassResource(resource.id, { used: resource.used + 1 })} disabled={!canEdit || layerLocks.figures || resource.used >= resource.max}>Потратить</button>
                  <button type="button" onClick={() => updateClassResource(resource.id, { used: 0 })} disabled={!canEdit || layerLocks.figures || resource.used === 0}>Восстановить</button>
                </div>
                <label>Максимум<input type="number" min="0" max="99" value={resource.max} onChange={event => updateClassResource(resource.id, { max: Number(event.target.value) || 0 })} disabled={!canEdit || layerLocks.figures}/></label>
              </div>) : <small>Добавь ограниченные классовые умения: ярость, вдохновение, канал божественности и другие.</small>}
              <form className="combat-roll-row" onSubmit={addClassResource}>
                <label>Название<input value={classResourceName} onChange={event => setClassResourceName(event.target.value)} placeholder="Например, Ярость" maxLength={60} disabled={!canEdit || layerLocks.figures}/></label>
                <label>Всего<input type="number" min="1" max="99" value={classResourceMax} onChange={event => setClassResourceMax(Math.max(1, Math.min(99, Number(event.target.value) || 1)))} disabled={!canEdit || layerLocks.figures}/></label>
                <label>Восстановление<select value={classResourceRecovery} onChange={event => setClassResourceRecovery(event.target.value as ClassResource["recovery"])} disabled={!canEdit || layerLocks.figures}><option value="short">Короткий отдых</option><option value="long">Длительный отдых</option><option value="manual">Вручную</option></select></label>
                <button type="submit" disabled={!canEdit || layerLocks.figures || !classResourceName.trim()}>Добавить ресурс</button>
              </form>
              <div className="combat-roll-buttons">
                <button type="button" className="secondary-button" onClick={() => recoverClassResources("short")} disabled={!canEdit || layerLocks.figures}>Восстановить после короткого отдыха</button>
                <button type="button" className="secondary-button" onClick={() => recoverClassResources("long")} disabled={!canEdit || layerLocks.figures}>Восстановить после длительного отдыха</button>
              </div>
              <small>Настройка выполняется вручную; ресурсы с восстановлением «вручную» отдыхом не сбрасываются.</small>
            </section>
            <section className="spellcasting-panel">
              <strong>Заклинания</strong>
              <label>Название заклинания<input list={`known-spells-${selected.id}`} value={spellName} onChange={event => setSpellName(event.target.value)} placeholder="Выбери или введи название" disabled={!canEdit || layerLocks.figures}/><datalist id={`known-spells-${selected.id}`}>{(selected.knownSpells ?? []).map((name,index)=><option key={index} value={name}/>)}</datalist></label>
              {selected.pactMagic && <div className="pact-magic-tracker">
                <strong>Магия договора</strong>
                <span>Ячейки {selected.pactMagic.level}-го уровня · доступно {Math.max(0, selected.pactMagic.max - selected.pactMagic.used)} из {selected.pactMagic.max}</span>
                <small>Все ячейки восстанавливаются после короткого или длительного отдыха.</small>
                <label><input type="checkbox" checked={usePactMagic} onChange={event => setUsePactMagic(event.target.checked)} disabled={!canEdit || selected.pactMagic.used >= selected.pactMagic.max}/> Использовать ячейку магии договора</label>
              </div>}
              <div className="combat-roll-row">
                <label>Уровень<select value={spellLevel} onChange={event => setSpellLevel(Number(event.target.value))} disabled={!canEdit}>
                  <option value={0}>Заговор</option>
                  {Array.from({length:9},(_,index)=>index+1).map(level=><option key={level} value={level}>{level}-й</option>)}
                </select></label>
                <label>Время накладывания<select value={spellResource} onChange={event => setSpellResource(event.target.value as typeof spellResource)} disabled={!canEdit}>
                  <option value="actionUsed">Действие</option><option value="bonusActionUsed">Бонусное действие</option><option value="reactionUsed">Реакция</option>
                </select></label>
              </div>
              <div className="spell-slot-overview">
                <strong>Ячейки заклинаний</strong>
                {Array.from({length:9},(_,index)=>index+1).map(level=>{
                  const slot=selected.spellSlots?.[level] ?? {max:0,used:0};
                  return <div className="spell-slot-row" key={level}>
                    <span>{level}-й уровень: {Math.max(0,slot.max-slot.used)} / {slot.max} доступно</span>
                    <label>Всего<input type="number" min="0" max="20" value={slot.max} onChange={event=>updateSpellSlotMaximum(level,Number(event.target.value)||0)} disabled={!canEdit || layerLocks.figures}/></label>
                    <small>Потрачено: {slot.used}</small>
                  </div>;
                })}
              </div>
              <label className="weapon-proficiency-toggle"><input type="checkbox" checked={spellConcentration} onChange={event => setSpellConcentration(event.target.checked)} disabled={!canEdit}/> Требуется концентрация</label>
              <button type="button" className="secondary-button" onClick={recoverSpellSlotsAfterLongRest} disabled={!canEdit || layerLocks.figures}>Завершить длительный отдых</button>
              <button type="button" onClick={castTrackedSpell} disabled={!canEdit || diceBusy || !spellName.trim() || (spellLevel > 0 && ((selected.spellSlots?.[spellLevel]?.max ?? 0) <= (selected.spellSlots?.[spellLevel]?.used ?? 0)))} >Наложить заклинание</button>
              <small>Учёт ячеек и боевого ресурса. Дальность, компоненты, цели, эффекты и доступность заклинания пока проверяются вручную.</small>
            </section>
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
        <div className="table-log table-log-below" aria-live="polite">{log.length ? log.map(entry => <p key={entry.id} className={`log-${entry.tone}`}>{entry.text}</p>) : <p className="room-empty-note">Событий пока нет. Здесь будут отображаться броски, заметки мастера и ход игры.</p>}</div>
      </section>
      <section className="table-panel table-chat-panel">
        <div className="table-panel-title"><div><Send size={15}/><strong>Чат партии</strong></div><span>{chatMessages.length} сообщений</span></div>
        <div className="table-chat-messages" role="log" aria-live="polite" aria-relevant="additions">
          {chatMessages.length ? chatMessages.map(item => <article className="table-chat-message" key={item.id}>
            <div><strong>{item.author.username}</strong><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>
            <p>{item.content}</p>
          </article>) : <p className="room-empty-note">Пока нет сообщений. Напиши первое сообщение для участников партии.</p>}
          <div ref={chatEndRef}/>
        </div>
        <form className="table-chat-form" onSubmit={sendMessage}>
          <input value={message} onChange={event => setMessage(event.target.value)} placeholder="Сообщение для участников…" maxLength={500} aria-label="Сообщение в чат" disabled={chatBusy}/>
          <button aria-label="Отправить сообщение" type="submit" disabled={chatBusy || !message.trim()}><Send size={15}/></button>
        </form>
        {chatError && <p className="table-chat-error" role="alert">{chatError}</p>}
        <small className="table-chat-hint">{remoteEnabled ? "Сообщения сохраняются в кампании и синхронизируются у участников." : "Локальный чат сохраняется в этом браузере."}</small>
      </section>
    </>}
  </section>;
}
