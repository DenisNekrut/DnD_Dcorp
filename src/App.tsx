import { useEffect, useState } from "react";
import { apiRequest, isApiConfigured } from "./api";
import GameTable from "./GameTable";
import TrainingArena from "./TrainingArena";
import CampaignMembersPanel from "./CampaignMembersPanel";
import AdminPanel from "./AdminPanel";
import "./styles/guest.css";
import "./styles/character-sheet.css";
import {
  BookOpen, ChevronDown, Compass, Dice5, Dumbbell, LayoutDashboard, Menu, Plus,
  Search, Settings, Shield, Sparkles, Swords, Users, UserRound, Bell,
  ScrollText, X, LockKeyhole, Globe2, Copy, WandSparkles
} from "lucide-react";

type Section = "Главная" | "Кампании" | "Игровой стол" | "Тренировка" | "Персонажи" | "Библиотека" | "Настройки" | "Администрирование";
type Campaign = { id: string; name: string; description: string; access: "Открытая" | "По приглашению"; players: number; canManage?: boolean; isOwner?: boolean };
type Character = { id: string | number; name: string; gender: string; ancestry: string; subrace: string; className: string; background: string; alignment: string; level: number; abilityScores: Record<string, number>; skillProficiencies: string[]; rawData?: Record<string, unknown>; derived: { maxHp:number; armorClass:number; initiative:number; speed:number; passivePerception:number; hitDie:string } };

const characterGenders = ["Мужской", "Женский", "Другое", "Не указывать"];
const characterAncestries = ["Драконорождённый", "Дварф", "Эльф", "Гном", "Полуэльф", "Полуорк", "Полурослик", "Человек", "Тифлинг"];
const characterClasses = ["Варвар", "Бард", "Жрец", "Друид", "Воин", "Монах", "Паладин", "Следопыт", "Плут", "Чародей", "Колдун", "Волшебник"];
const characterBackgrounds = ["Прислужник", "Шарлатан", "Преступник", "Артист", "Народный герой", "Гильдейский ремесленник", "Отшельник", "Благородный", "Чужеземец", "Мудрец", "Моряк", "Солдат", "Беспризорник"];
const characterAlignments = ["Законно-доброе", "Нейтрально-доброе", "Хаотично-доброе", "Законно-нейтральное", "Нейтральное", "Хаотично-нейтральное", "Законно-злое", "Нейтрально-злое", "Хаотично-злое"];
const abilityFields = [{ id: "str", name: "Сила" }, { id: "dex", name: "Ловкость" }, { id: "con", name: "Телосложение" }, { id: "int", name: "Интеллект" }, { id: "wis", name: "Мудрость" }, { id: "cha", name: "Харизма" }];
const standardArray = [15, 14, 13, 12, 10, 8];
const ancestryBonuses: Record<string,Record<string,number>> = {
  "Драконорождённый":{str:2,cha:1},"Дварф":{con:2},"Эльф":{dex:2},"Гном":{int:2},
  "Полуэльф":{cha:2},"Полуорк":{str:2,con:1},"Полурослик":{dex:2},
  "Человек":{str:1,dex:1,con:1,int:1,wis:1,cha:1},"Тифлинг":{cha:2,int:1}
};
const subraceBonuses: Record<string,Record<string,number>> = {
  "Дварф:Холмовой":{wis:1},"Дварф:Горный":{str:2},
  "Эльф:Высший":{int:1},"Эльф:Лесной":{wis:1},"Эльф:Тёмный":{cha:1},
  "Гном:Лесной":{dex:1},"Гном:Скальный":{con:1},
  "Полурослик:Легконогий":{cha:1},"Полурослик:Коренастый":{con:1}
};
const classHitDice: Record<string,number> = {"Варвар":12,"Бард":8,"Жрец":8,"Друид":8,"Воин":10,"Монах":8,"Паладин":10,"Следопыт":10,"Плут":8,"Чародей":6,"Колдун":8,"Волшебник":6};
const classSavingThrows: Record<string,string[]> = {
  "Варвар":["str","con"], "Бард":["dex","cha"], "Жрец":["wis","cha"], "Друид":["int","wis"],
  "Воин":["str","con"], "Монах":["str","dex"], "Паладин":["wis","cha"], "Следопыт":["str","dex"],
  "Плут":["dex","int"], "Чародей":["con","cha"], "Колдун":["wis","cha"], "Волшебник":["int","wis"],
};
const skillAbilities: Record<string,string> = {
  acrobatics:"dex", animalHandling:"wis", arcana:"int", athletics:"str", deception:"cha",
  history:"int", insight:"wis", intimidation:"cha", investigation:"int", medicine:"wis",
  nature:"int", perception:"wis", performance:"cha", persuasion:"cha", religion:"int",
  sleightOfHand:"dex", stealth:"dex", survival:"wis",
};
const proficiencyBonusForLevel = (level:number) => 2 + Math.floor((Math.max(1,Math.min(20,level))-1)/4);
const signedBonus = (value:number) => value >= 0 ? `+${value}` : String(value);
const toStringArray = (value:unknown):string[] => Array.isArray(value) ? value.filter((item):item is string => typeof item === "string") : [];
const sheetListFields = [
  {key:"equipment",label:"Снаряжение"},
  {key:"features",label:"Особенности и способности"},
  {key:"attacks",label:"Атаки"},
  {key:"spells",label:"Заклинания"},
  {key:"conditions",label:"Состояния"},
  {key:"languages",label:"Языки"},
] as const;
const sheetBiographyFields = [
  {key:"personalityTraits",label:"Черты характера"},
  {key:"ideals",label:"Идеалы"},
  {key:"bonds",label:"Привязанности"},
  {key:"flaws",label:"Слабости"},
  {key:"appearance",label:"Внешность"},
  {key:"backstory",label:"Предыстория"},
] as const;
const currencyKeys = ["cp","sp","ep","gp","pp"] as const;
type CurrencyKey = typeof currencyKeys[number];
const currencyLabels: Record<CurrencyKey,string> = {cp:"ММ",sp:"СМ",ep:"ЭМ",gp:"ЗМ",pp:"ПМ"};
const skillCatalog = [{id:"acrobatics",name:"Акробатика"},{id:"animalHandling",name:"Уход за животными"},{id:"arcana",name:"Магия"},{id:"athletics",name:"Атлетика"},{id:"deception",name:"Обман"},{id:"history",name:"История"},{id:"insight",name:"Проницательность"},{id:"intimidation",name:"Запугивание"},{id:"investigation",name:"Расследование"},{id:"medicine",name:"Медицина"},{id:"nature",name:"Природа"},{id:"perception",name:"Восприятие"},{id:"performance",name:"Выступление"},{id:"persuasion",name:"Убеждение"},{id:"religion",name:"Религия"},{id:"sleightOfHand",name:"Ловкость рук"},{id:"stealth",name:"Скрытность"},{id:"survival",name:"Выживание"}];
const classSkillRules: Record<string,{count:number; options:string[]}> = {
  "Варвар":{count:2,options:["animalHandling","athletics","intimidation","nature","perception","survival"]},"Бард":{count:3,options:skillCatalog.map(skill=>skill.id)},"Жрец":{count:2,options:["history","insight","medicine","persuasion","religion"]},"Друид":{count:2,options:["animalHandling","arcana","insight","medicine","nature","perception","religion","survival"]},"Воин":{count:2,options:["acrobatics","animalHandling","athletics","history","insight","intimidation","perception","survival"]},"Монах":{count:2,options:["acrobatics","athletics","history","insight","religion","stealth"]},"Паладин":{count:2,options:["athletics","insight","intimidation","medicine","persuasion","religion"]},"Следопыт":{count:3,options:["animalHandling","athletics","insight","investigation","nature","perception","stealth","survival"]},"Плут":{count:4,options:["acrobatics","athletics","deception","insight","intimidation","investigation","perception","performance","persuasion","sleightOfHand","stealth"]},"Чародей":{count:2,options:["arcana","deception","insight","intimidation","persuasion","religion"]},"Колдун":{count:2,options:["arcana","deception","history","intimidation","investigation","nature","religion"]},"Волшебник":{count:2,options:["arcana","history","insight","investigation","medicine","religion"]}
};
const ancestrySubraces: Record<string, string[]> = {
  "Дварф": ["Холмовой", "Горный"],
  "Эльф": ["Высший", "Лесной", "Тёмный"],
  "Гном": ["Лесной", "Скальный"],
  "Полурослик": ["Легконогий", "Коренастый"]
};

const navigation: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Главная", icon: LayoutDashboard }, { label: "Кампании", icon: Swords }, { label: "Игровой стол", icon: Dice5 }, { label: "Тренировка", icon: Dumbbell },
  { label: "Персонажи", icon: UserRound }, { label: "Библиотека", icon: BookOpen },
  { label: "Настройки", icon: Settings }, { label: "Администрирование", icon: Shield }
];

type SessionUser = { id: string; email: string; username: string; platformRole: "USER" | "ADMIN" };
type ApiCharacter = { id: string; name: string; data: Record<string, unknown> };
type ApiCampaign = { id: string; name: string; description?: string | null; applicationsOpen?: boolean; ownerId?: string; memberships?: Array<{ status: string; role?: string }>; _count?: { memberships?: number } };
type GuestWorkspace = { campaigns: Campaign[]; characters: Character[] };
const GUEST_STORAGE_KEY = "dnd-dcorp-guest-workspace-v1";
function readGuestWorkspace(): GuestWorkspace {
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return { campaigns: [], characters: [] };
    const parsed = JSON.parse(raw) as Partial<GuestWorkspace>;
    return { campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [], characters: Array.isArray(parsed.characters) ? parsed.characters : [] };
  } catch { return { campaigns: [], characters: [] }; }
}

function mapApiCharacter(item: ApiCharacter): Character {
  const data = item.data;
  const scores = (data.abilityScores ?? {}) as Record<string, number>;
  const hp = (data.hitPoints ?? {}) as { maximum?: number };
  const hitDice = (data.hitDice ?? {}) as { die?: string };
  return {
    id: item.id, name: item.name, gender: String(data.gender ?? ""),
    ancestry: String(data.ancestry ?? data.species ?? ""), subrace: String(data.subrace ?? ""),
    className: String(data.characterClass ?? ""), background: String(data.background ?? ""),
    alignment: String(data.alignment ?? ""), level: Number(data.level ?? 1),
    abilityScores: scores, skillProficiencies: Array.isArray(data.skillProficiencies) ? data.skillProficiencies as string[] : [],
    rawData: data,
    derived: {
      maxHp: Number(hp.maximum ?? 1), armorClass: Number(data.armorClass ?? 10),
      initiative: Number(data.initiative ?? 0), speed: Number(data.speed ?? 30),
      passivePerception: Number(data.passivePerception ?? 10), hitDie: String(hitDice.die ?? "d8").replace("d", "к"),
    },
  };
}

function App() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const apiReady = isApiConfigured();
  const [active, setActive] = useState<Section>("Главная");
  const [menuOpen, setMenuOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [membersCampaign, setMembersCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [sheetCurrentHp, setSheetCurrentHp] = useState("");
  const [sheetTemporaryHp, setSheetTemporaryHp] = useState("0");
  const [sheetSaveBusy, setSheetSaveBusy] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const [sheetDetailsError, setSheetDetailsError] = useState("");
  const [campaignModal, setCampaignModal] = useState(false);
  const [campaignError, setCampaignError] = useState("");
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [characterModal, setCharacterModal] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [characterError, setCharacterError] = useState("");
  const [characterGender, setCharacterGender] = useState("");
  const [characterAncestry, setCharacterAncestry] = useState("");
  const [characterClass, setCharacterClass] = useState("");
  const [characterSubrace, setCharacterSubrace] = useState("");
  const [characterBackground, setCharacterBackground] = useState("");
  const [characterAlignment, setCharacterAlignment] = useState("");
  const [characterAbilityScores, setCharacterAbilityScores] = useState<Record<string, number>>({str:15,dex:14,con:13,int:12,wis:10,cha:8});
  const [characterSkills, setCharacterSkills] = useState<string[]>([]);
  const [halfElfBonusOne, setHalfElfBonusOne] = useState("str");
  const [halfElfBonusTwo, setHalfElfBonusTwo] = useState("dex");
  const [query, setQuery] = useState("");
  const [inviteCode, setInviteCode] = useState(() => new URLSearchParams(window.location.search).get("invite") ?? "");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinNotice, setJoinNotice] = useState("");

  useEffect(() => {
    if (!isApiConfigured()) { setAuthLoading(false); return; }
    apiRequest<{ user: SessionUser }>("/auth/me")
      .then(result => setSessionUser(result.user))
      .catch(() => { setSessionUser(null); })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!sessionUser || isGuest) { return; }
    apiRequest<ApiCharacter[]>("/characters/personal")
      .then(items => setCharacters(items.map(mapApiCharacter)))
      .catch(error => setAuthError(error instanceof Error ? error.message : "Не удалось загрузить персонажей."));
    apiRequest<ApiCampaign[]>("/campaigns/mine")
      .then(items => setCampaigns(items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        access: item.applicationsOpen === false ? "По приглашению" : "Открытая",
        players: 1 + (item.memberships ?? []).filter(member => member.status === "APPROVED").length,
        canManage: item.ownerId === sessionUser.id || (item.memberships ?? []).some(member => member.status === "APPROVED" && member.role === "GAME_MASTER"),
        isOwner: item.ownerId === sessionUser.id,
      }))))
      .catch(error => setCampaignError(error instanceof Error ? error.message : "Не удалось загрузить кампании."));
  }, [sessionUser, isGuest]);

  useEffect(() => {
    if (!isGuest) return;
    try { window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ campaigns, characters })); } catch { setAuthError("Браузер не разрешил сохранить гостевые данные локально."); }
  }, [isGuest, campaigns, characters]);

  const startGuestSession = () => {
    const workspace = readGuestWorkspace();
    setCampaigns(workspace.campaigns);
    setCharacters(workspace.characters);
    setIsGuest(true);
    setSessionUser({ id: "guest-local", email: "", username: "Гость", platformRole: "USER" });
    setAuthError("");
    setActive("Главная");
  };

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault(); setAuthError(""); setAuthBusy(true);
    try {
      const path = authMode === "login" ? "/auth/login" : "/auth/register";
      const body = authMode === "login"
        ? { email: authEmail.trim(), password: authPassword }
        : { email: authEmail.trim(), username: authUsername.trim(), password: authPassword };
      const result = await apiRequest<{ user: SessionUser }>(path, { method: "POST", body: JSON.stringify(body) });
      setSessionUser(result.user); setAuthPassword("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Не удалось выполнить вход.");
    } finally { setAuthBusy(false); }
  };

  const logout = async () => {
    if (isGuest) {
      setIsGuest(false); setSessionUser(null); setCharacters([]); setCampaigns([]); setSelectedCampaign(null); setActive("Главная"); setAuthError("");
      return;
    }
    try { await apiRequest("/auth/logout", { method: "POST" }); }
    finally { setSessionUser(null); setCharacters([]); setCampaigns([]); setAuthError(""); }
  };

  const submitCampaignInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setJoinError("");
    setJoinNotice("");
    if (isGuest || !sessionUser || !apiReady) {
      setJoinError("Для вступления в общую кампанию войди в аккаунт. Гостевой режим хранит данные только в этом браузере.");
      return;
    }
    const rawInput = inviteCode.trim();
    if (!rawInput) {
      setJoinError("Введи код или вставь ссылку приглашения.");
      return;
    }

    let inviteToken = rawInput;
    try {
      const parsed = new URL(rawInput, window.location.origin);
      inviteToken = parsed.searchParams.get("invite") ?? parsed.pathname.split("/").filter(Boolean).at(-1) ?? rawInput;
    } catch { /* Treat the input as a raw invitation code. */ }

    if (!inviteToken || inviteToken.length > 128) {
      setJoinError("Ссылка или код приглашения выглядит некорректно.");
      return;
    }

    setJoinBusy(true);
    try {
      await apiRequest<{ id: string; campaignId: string; status: string }>(
        `/campaigns/join/${encodeURIComponent(inviteToken)}`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setInviteCode("");
      setJoinNotice("Заявка отправлена. Мастер кампании должен одобрить вступление, после этого кампания появится в твоём списке.");
      if (new URLSearchParams(window.location.search).has("invite")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      }
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Не удалось отправить заявку на вступление.");
    } finally {
      setJoinBusy(false);
    }
  };

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    setCampaignError("");
    if (campaignName.trim().length < 2) { setCampaignError("Название должно содержать не менее двух символов."); return; }
    if (isGuest) {
      setCampaigns(items => [{ id: `guest-${Date.now()}`, name: campaignName.trim(), description: campaignDescription.trim(), access: "Открытая", players: 1 }, ...items]);
      setCampaignName(""); setCampaignDescription(""); setCampaignModal(false);
      return;
    }
    setCampaignBusy(true);
    try {
      const created = await apiRequest<ApiCampaign & { inviteToken?: string }>("/campaigns", {
        method: "POST",
        body: JSON.stringify({ name: campaignName.trim(), description: campaignDescription.trim() }),
      });
      setCampaigns(items => [...items, {
        id: created.id,
        name: created.name,
        description: created.description ?? "",
        access: created.applicationsOpen === false ? "По приглашению" : "Открытая",
        players: 1,
        canManage: true,
        isOwner: true,
      }]);
      setCampaignName(""); setCampaignDescription(""); setCampaignModal(false);
    } catch (error) {
      setCampaignError(error instanceof Error ? error.message : "Не удалось создать кампанию. Попробуй ещё раз.");
    } finally { setCampaignBusy(false); }
  };
  const openCharacterSheet = (character: Character) => {
    const hitPoints = (character.rawData?.hitPoints ?? {}) as { current?: number; temporary?: number };
    setSheetCurrentHp(String(hitPoints.current ?? character.derived.maxHp));
    setSheetTemporaryHp(String(hitPoints.temporary ?? 0));
    setSheetError("");
    setSheetDetailsError("");
    setSelectedCharacter(character);
  };

  const saveCharacterHitPoints = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCharacter) return;
    const current = Number(sheetCurrentHp);
    const temporary = Number(sheetTemporaryHp);
    const previousHitPoints = (selectedCharacter.rawData?.hitPoints ?? {}) as Record<string, unknown>;
    const maximum = Number(previousHitPoints.maximum ?? selectedCharacter.derived.maxHp);
    if (!Number.isInteger(current) || current < 0 || current > maximum) {
      setSheetError(`Текущие хиты должны быть целым числом от 0 до ${maximum}.`);
      return;
    }
    if (!Number.isInteger(temporary) || temporary < 0) {
      setSheetError("Временные хиты должны быть целым неотрицательным числом.");
      return;
    }
    const nextData = {
      ...(selectedCharacter.rawData ?? {}),
      hitPoints: { ...previousHitPoints, maximum, current, temporary },
    };
    setSheetSaveBusy(true);
    setSheetError("");
    try {
      if (isGuest) {
        const updated = { ...selectedCharacter, rawData: nextData };
        setCharacters(items => items.map(item => item.id === updated.id ? updated : item));
        setSelectedCharacter(updated);
      } else {
        const saved = await apiRequest<ApiCharacter>(`/characters/personal/${selectedCharacter.id}`, {
          method: "PATCH",
          body: JSON.stringify({ data: { hitPoints: { maximum, current, temporary } } }),
        });
        const updated = mapApiCharacter(saved);
        setCharacters(items => items.map(item => item.id === updated.id ? updated : item));
        setSelectedCharacter(updated);
      }
    } catch (error) {
      setSheetError(error instanceof Error ? error.message : "Не удалось сохранить хиты персонажа.");
    } finally {
      setSheetSaveBusy(false);
    }
  };

  const saveCharacterSheetData = async (patch: Record<string, unknown>): Promise<boolean> => {
    if (!selectedCharacter) return false;
    setSheetSaveBusy(true);
    setSheetDetailsError("");
    try {
      if (isGuest) {
        const updated = { ...selectedCharacter, rawData: { ...(selectedCharacter.rawData ?? {}), ...patch } };
        setCharacters(items => items.map(item => item.id === updated.id ? updated : item));
        setSelectedCharacter(updated);
      } else {
        const saved = await apiRequest<ApiCharacter>(`/characters/personal/${selectedCharacter.id}`, {
          method: "PATCH",
          body: JSON.stringify({ data: patch }),
        });
        const updated = mapApiCharacter(saved);
        setCharacters(items => items.map(item => item.id === updated.id ? updated : item));
        setSelectedCharacter(updated);
      }
      return true;
    } catch (error) {
      setSheetDetailsError(error instanceof Error ? error.message : "Не удалось сохранить данные листа персонажа.");
      return false;
    } finally {
      setSheetSaveBusy(false);
    }
  };

  const createCharacter = async (event: React.FormEvent) => {
    event.preventDefault();
    setCharacterError("");
    const fail = (message: string) => { setCharacterError(message); };
    if (!characterName.trim()) return fail("Укажи имя персонажа.");
    if (!characterGender || !characterAncestry || !characterClass || !characterBackground || !characterAlignment) return fail("Заполни все обязательные поля персонажа.");
    if (!characterGenders.includes(characterGender) || !characterAncestries.includes(characterAncestry) || !characterClasses.includes(characterClass) || !characterBackgrounds.includes(characterBackground) || !characterAlignments.includes(characterAlignment)) return fail("Выбери значения из предложенных списков.");
    const availableSubraces = ancestrySubraces[characterAncestry] ?? [];
    if (availableSubraces.length > 0 && !availableSubraces.includes(characterSubrace)) return fail("Выбери подрасу для выбранной расы.");
    const classRule = classSkillRules[characterClass];
    if (!classRule) return fail("Не удалось определить правила выбранного класса. Выбери класс заново.");
    if (characterSkills.length !== classRule.count) return fail(`Для класса «${characterClass}» нужно выбрать навыков: ${classRule.count}. Сейчас выбрано: ${characterSkills.length}.`);
    if (characterSkills.some(skill => !classRule.options.includes(skill))) return fail("Есть навык, который недоступен выбранному классу. Проверь выбор навыков.");
    if (new Set(Object.values(characterAbilityScores)).size !== 6 || Object.values(characterAbilityScores).some(score => !standardArray.includes(score))) return fail("Распредели все значения характеристик из набора 15, 14, 13, 12, 10, 8 без повторений.");
    if(characterAncestry==="Полуэльф" && halfElfBonusOne===halfElfBonusTwo) return fail("Для полуэльфа выбери две разные характеристики для увеличения.");
    const finalScores = {...characterAbilityScores};
    for(const [ability,bonus] of Object.entries(ancestryBonuses[characterAncestry]??{})) finalScores[ability]=(finalScores[ability]??0)+bonus;
    for(const [ability,bonus] of Object.entries(subraceBonuses[characterAncestry+":"+characterSubrace]??{})) finalScores[ability]=(finalScores[ability]??0)+bonus;
    if(characterAncestry==="Полуэльф"){finalScores[halfElfBonusOne]+=1;finalScores[halfElfBonusTwo]+=1;}
    const modifier=(score:number)=>Math.floor((score-10)/2);
    const conMod=modifier(finalScores.con); const dexMod=modifier(finalScores.dex); const wisMod=modifier(finalScores.wis);
    const hitDie=classHitDice[characterClass];
    const speed=characterAncestry==="Дварф"||characterAncestry==="Гном"||characterAncestry==="Полурослик"?25:30;
    const passivePerception=10+wisMod+(characterSkills.includes("perception")?2:0);
    try {
      const maximumHp = Math.max(1, hitDie + conMod);
      if (isGuest) {
        const localCharacter: Character = {
          id: `guest-${Date.now()}`, name: characterName.trim(), gender: characterGender,
          ancestry: characterAncestry, subrace: characterSubrace, className: characterClass,
          background: characterBackground, alignment: characterAlignment, level: 1,
          abilityScores: finalScores, skillProficiencies: characterSkills,
          rawData: {
            level: 1, abilityScores: finalScores, skillProficiencies: characterSkills,
            savingThrowProficiencies: classSavingThrows[characterClass] ?? [],
            hitPoints: { maximum: maximumHp, current: maximumHp, temporary: 0 },
            hitDice: { total: 1, remaining: 1, die: `d${hitDie}` },
          },
          derived: { maxHp: maximumHp, armorClass: 10 + dexMod, initiative: dexMod, speed, passivePerception, hitDie: `к${hitDie}` },
        };
        setCharacters(items => [localCharacter, ...items]);
      } else {
      const saved = await apiRequest<ApiCharacter>("/characters/personal", {
        method: "POST",
        body: JSON.stringify({
          name: characterName.trim(),
          data: {
            gender: characterGender, ancestry: characterAncestry, species: characterAncestry,
            subrace: characterSubrace, characterClass, background: characterBackground,
            alignment: characterAlignment, level: 1, abilityScores: finalScores,
            skillProficiencies: characterSkills, savingThrowProficiencies: classSavingThrows[characterClass] ?? [],
            armorClass: 10 + dexMod, speed, hitPoints: { maximum: maximumHp, current: maximumHp, temporary: 0 },
            hitDice: { total: 1, remaining: 1, die: `d${hitDie}` },
          },
        }),
      });
      setCharacters(items => [mapApiCharacter(saved), ...items]);
      }
    } catch (error) {
      setCharacterError(error instanceof Error ? error.message : "Не удалось сохранить персонажа. Проверь соединение с сервером.");
      return;
    }
    setCharacterName(""); setCharacterGender(""); setCharacterAncestry(""); setCharacterClass(""); setCharacterSubrace(""); setCharacterBackground(""); setCharacterAlignment(""); setCharacterAbilityScores({str:15,dex:14,con:13,int:12,wis:10,cha:8}); setCharacterSkills([]); setHalfElfBonusOne("str"); setHalfElfBonusTwo("dex"); setCharacterError(""); setCharacterModal(false);
  };

  if (authLoading) return <div className="auth-screen"><section className="auth-card"><h1>DnD_Dcorp</h1><p>Проверяем подключение к аккаунту…</p></section></div>;
  if (!sessionUser) return <div className="auth-screen"><section className="auth-card"><div className="eyebrow"><span/> ПРОСТРАНСТВО ПРИКЛЮЧЕНИЙ</div><h1>{apiReady ? (authMode === "login" ? "С возвращением" : "Создать аккаунт") : "Добро пожаловать"}</h1>
    {apiReady ? <><p>Войди, чтобы сохранять персонажей и участвовать в кампаниях.</p><form className="modal-form" onSubmit={submitAuth}>
      <label>Электронная почта<input type="email" required autoComplete="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="name@example.com"/></label>
      {authMode === "register" && <label>Имя пользователя<input required minLength={3} maxLength={32} value={authUsername} onChange={e=>setAuthUsername(e.target.value)} placeholder="Имя в игре"/></label>}
      <label>Пароль<input type="password" required minLength={12} maxLength={128} autoComplete={authMode === "login" ? "current-password" : "new-password"} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Не менее 12 символов"/></label>
      {authError && <p className="validation-note" role="alert">{authError}</p>}
      <button className="button button-primary full-width" type="submit" disabled={authBusy}>{authBusy ? "Подождите…" : authMode === "login" ? "Войти" : "Зарегистрироваться"}</button>
    </form><button className="text-button auth-switch" onClick={()=>{setAuthMode(authMode==="login"?"register":"login");setAuthError("");}}>{authMode==="login"?"Нет аккаунта? Зарегистрироваться":"Уже есть аккаунт? Войти"}</button></> : <><p className="auth-hint">Сервер пока не подключён. Можно продолжить разработку в гостевом режиме — данные будут храниться только в этом браузере.</p></>}
    <div className="guest-entry"><button className={apiReady ? "button button-secondary full-width" : "button button-primary full-width"} onClick={startGuestSession}>Продолжить как гость</button><small>Гостевые данные не синхронизируются с другими устройствами и аккаунтами.</small></div>
  </section></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Swords size={23}/></div><div><strong>DnD_Dcorp</strong><span>ПРИКЛЮЧЕНИЯ НАЧИНАЮТСЯ ЗДЕСЬ</span></div><button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Закрыть меню"><X size={18}/></button></div>
      <div className="nav-caption">РАЗДЕЛЫ</div>
      <nav className="main-nav" aria-label="Основная навигация">{navigation.filter(item=>item.label!=="Администрирование"||sessionUser.platformRole==="ADMIN").map(({label,icon:Icon})=><button key={label} className={`nav-item ${active===label?"active":""}`} onClick={()=>{setActive(label);setMenuOpen(false);}}><Icon size={18}/><span>{label}</span>{active===label&&<span className="nav-indicator"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><Sparkles size={17}/><p>Твоя история. Твои решения. Твой мир.</p></div><button className="profile-mini profile-logout" onClick={logout} title={isGuest ? "Выйти из гостевого режима" : "Выйти из аккаунта"}><div className="avatar">{sessionUser.username.slice(0,1).toUpperCase()}</div><div><strong>{sessionUser.username}</strong><span>{isGuest ? "Гостевой режим · Выйти" : "Аккаунт · Выйти"}</span></div><ChevronDown size={16}/></button></div>
    </aside>
    {menuOpen&&<button className="scrim" aria-label="Закрыть меню" onClick={()=>setMenuOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-button menu-toggle" onClick={()=>setMenuOpen(true)} aria-label="Открыть меню"><Menu size={20}/></button><div className="breadcrumbs"><span>DnD_Dcorp</span><span className="crumb-separator">/</span><strong>{active}</strong></div><div className="top-actions"><button className="icon-button search-button" aria-label="Поиск"><Search size={18}/></button><button className="icon-button notification-button" aria-label="Уведомления"><Bell size={18}/><i/></button><button className="top-avatar" title={sessionUser.username} onClick={logout}>{sessionUser.username.slice(0,1).toUpperCase()}</button></div></header>
      <div className="content">
        {isGuest&&<div className="notice-strip guest-mode-banner"><Shield size={17}/><span><strong>Гостевой режим.</strong> Персонажи и кампании сохраняются только в этом браузере. Общие сессии, серверная синхронизация и администрирование пока недоступны.</span></div>}
        {active==="Главная"&&<Dashboard campaigns={campaigns} characters={characters} onCampaign={()=>setActive("Кампании")} onCharacters={()=>setActive("Персонажи")} onCreate={()=>setCampaignModal(true)}/>}
        {active==="Кампании"&&<section className="page-section">
          <div className="page-heading"><div><div className="eyebrow"><span/> СОВМЕСТНЫЕ ПРИКЛЮЧЕНИЯ</div><h1>Кампании</h1><p className="subtitle">Создавай игровые миры или присоединяйся к приключениям.</p></div><button className="button button-primary" onClick={()=>setCampaignModal(true)}><Plus size={17}/> Создать кампанию</button></div>
          <div className="toolbar"><div className="search-field"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск среди моих кампаний"/></div><span className="muted-count">{campaigns.length} кампаний</span></div>
          {campaigns.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())).length===0?<EmptyState icon={<Swords size={26}/>} title="Пока нет кампаний" description="Создай первую кампанию. Здесь появятся твои игровые миры и приглашения." action="Создать кампанию" onAction={()=>setCampaignModal(true)}/>:<div className="entity-grid">{campaigns.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())).map(c=><article className="entity-card" key={c.id}><div className="entity-card-top"><div className="quick-icon gold-icon"><Swords size={22}/></div><span className="status-pill">{c.access==="Открытая"?<Globe2 size={13}/>:<LockKeyhole size={13}/>} {c.access}</span></div><h3>{c.name}</h3><p>{c.description||"Описание кампании пока не добавлено."}</p><div className="entity-meta"><span><Users size={14}/> {c.players} участник</span><span>Система: 5e</span></div><div className="campaign-card-actions">{c.canManage&&<button className="button button-secondary" onClick={()=>setMembersCampaign(c)}><Users size={15}/> Участники</button>}<button className="button button-secondary" onClick={() => { setSelectedCampaign(c); setActive("Игровой стол"); }}>Открыть игровой стол <Compass size={15}/></button></div><small className="prototype-note">Открывает интерактивную сцену кампании</small></article>)}</div>}
          <form className="join-panel join-form" onSubmit={submitCampaignInvite}>
            <div className="join-icon"><Copy size={19}/></div>
            <div className="join-details"><strong>Есть приглашение?</strong><span>Вставь код или полную ссылку. Мастер получит заявку и сможет принять тебя в кампанию.</span></div>
            <div className="join-invite-controls"><input aria-label="Код или ссылка приглашения" value={inviteCode} onChange={event=>setInviteCode(event.target.value)} placeholder="Код или ссылка приглашения" disabled={joinBusy || isGuest} maxLength={512}/><button className="button button-secondary" type="submit" disabled={joinBusy || isGuest || !inviteCode.trim()}>{joinBusy ? "Отправляем…" : "Отправить заявку"}</button></div>
          </form>
          {isGuest && <p className="join-feedback">Для вступления в общую кампанию сначала войди в аккаунт.</p>}
          {joinError && <p className="join-feedback join-feedback-error" role="alert">{joinError}</p>}
          {joinNotice && <p className="join-feedback join-feedback-success" role="status">{joinNotice}</p>}
        </section>}
        {active==="Игровой стол"&&<GameTable campaignName={selectedCampaign?.name ?? "Демонстрационная сцена"} campaignId={selectedCampaign?.id} isGuest={isGuest} onBack={()=>setActive("Кампании")}/>}
        {active==="Тренировка"&&<TrainingArena characters={characters}/> }
        {active==="Персонажи"&&<section className="page-section">
          <div className="page-heading"><div><div className="eyebrow"><span/> ТВОИ ГЕРОИ</div><h1>Персонажи</h1><p className="subtitle">Личная коллекция героев для будущих приключений.</p></div><button className="button button-primary" onClick={()=>setCharacterModal(true)}><Plus size={17}/> Создать персонажа</button></div>
          <div className="notice-strip"><Shield size={17}/><span>{isGuest ? "Гостевые карточки сохраняются локально в этом браузере и пока не связаны с аккаунтом." : "Личные карточки сохраняются в аккаунте и не зависят от копий персонажей в кампаниях."}</span></div>{authError && <p className="validation-note" role="alert">{authError}</p>}
          {characters.length===0?<EmptyState icon={<UserRound size={26}/>} title="Твоя коллекция пока пуста" description="Создай первого героя. В листе персонажа будут храниться характеристики, навыки, хиты, снаряжение и заметки." action="Создать персонажа" onAction={()=>setCharacterModal(true)}/>:<div className="character-grid">{characters.map(c=><article className="character-card" key={c.id}><div className="character-art"><div className="character-sigil"><UserRound size={35}/></div><span>УРОВЕНЬ {c.level}</span></div><div className="character-info"><h3>{c.name}</h3><p>{c.gender} · {c.ancestry}{c.subrace ? ` (${c.subrace})` : ""} · {c.className}</p><p className="character-background">{c.background} · {c.alignment}</p><div className="ability-preview">{abilityFields.map(ability=><span key={ability.id}><b>{ability.name}</b>{c.abilityScores[ability.id]} <small>{Math.floor((c.abilityScores[ability.id]-10)/2)>=0?"+":""}{Math.floor((c.abilityScores[ability.id]-10)/2)}</small></span>)}</div><div className="skill-preview"><b>Владения навыками</b><span>{c.skillProficiencies.map(id=>skillCatalog.find(skill=>skill.id===id)?.name).join(", ")}</span></div><div className="derived-preview"><span><b>ХИТЫ</b>{c.derived.maxHp}</span><span><b>КД</b>{c.derived.armorClass}</span><span><b>ИНИЦИАТИВА</b>{c.derived.initiative>=0?"+":""}{c.derived.initiative}</span><span><b>СКОРОСТЬ</b>{c.derived.speed} фт.</span><span><b>ПАСС. ВОСПРИЯТИЕ</b>{c.derived.passivePerception}</span><span><b>КОСТЬ ХИТОВ</b>{c.derived.hitDie}</span></div><div className="stat-preview"><span><b>КЛАСС</b>{c.className}</span><span><b>УРОВЕНЬ</b>{c.level}</span><span><b>СОСТОЯНИЕ</b>Личный</span></div><button className="button button-secondary full-width" onClick={() => openCharacterSheet(c)}>Открыть лист персонажа</button></div></article>)}</div>}
        </section>}
        {active==="Библиотека"&&<section className="page-section"><div className="page-heading"><div><div className="eyebrow"><span/> СПРАВОЧНЫЕ МАТЕРИАЛЫ</div><h1>Библиотека</h1><p className="subtitle">Игровые справочники и материалы кампаний.</p></div></div><div className="library-grid">{[{title:"Персонажи",desc:"Классы, происхождения, предыстории и развитие.",icon:<UserRound/>},{title:"Существа",desc:"Противники, союзники и игровые характеристики.",icon:<Swords/>},{title:"Заклинания",desc:"Магические эффекты и правила их применения.",icon:<WandSparkles/>},{title:"Предметы",desc:"Снаряжение, оружие, доспехи и сокровища.",icon:<Shield/>}].map(x=><article className="library-card" key={x.title}><div className="quick-icon purple-icon">{x.icon}</div><h3>{x.title}</h3><p>{x.desc}</p><span className="coming-label">Раздел готовится</span></article>)}</div></section>}
        {active==="Администрирование"&&sessionUser.platformRole==="ADMIN"&&!isGuest&&<AdminPanel/>}
        {active==="Настройки"&&<section className="page-section"><div className="page-heading"><div><div className="eyebrow"><span/> УПРАВЛЕНИЕ АККАУНТОМ</div><h1>Настройки</h1><p className="subtitle">Параметры профиля и приложения.</p></div></div><div className="settings-card"><div className="settings-avatar">П</div><div><h3>{sessionUser.username}</h3><p>{isGuest ? "Ты используешь гостевой режим. Данные хранятся локально в этом браузере." : "Ты вошёл в личный аккаунт. Данные синхронизируются с сервером."}</p><span className="status-pill">{isGuest ? "Гостевой режим" : "Аккаунт подключён"}</span></div></div></section>}
        <footer>DnD_Dcorp <span>•</span> Пространство для настольных приключений</footer>
      </div>
    </main>
    {campaignModal&&<Modal title="Новая кампания" onClose={()=>setCampaignModal(false)}><form className="modal-form" onSubmit={createCampaign}><label>Название кампании<input autoFocus required value={campaignName} onChange={e=>setCampaignName(e.target.value)} placeholder="Например, Тайны старого королевства"/></label><label>Краткое описание<textarea value={campaignDescription} onChange={e=>setCampaignDescription(e.target.value)} placeholder="О чём будет это приключение?"/></label><p className="notice-strip">{isGuest ? "Кампания будет сохранена локально в этом браузере. При подключении аккаунта она автоматически на сервер не переносится." : "Кампания будет сохранена на сервере и появится в твоём списке. Настройки приватности и пароль добавим в управлении кампанией."}</p>{campaignError&&<p className="validation-note" role="alert">{campaignError}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={()=>setCampaignModal(false)}>Отмена</button><button className="button button-primary" type="submit" disabled={campaignBusy}>{campaignBusy?"Сохранение…":<><Plus size={16}/> Создать</>}</button></div></form></Modal>}
    {membersCampaign && membersCampaign.canManage && <Modal title={`Участники — ${membersCampaign.name}`} onClose={() => setMembersCampaign(null)}><CampaignMembersPanel campaignId={membersCampaign.id} isOwner={membersCampaign.isOwner === true} /></Modal>}
    {selectedCharacter && <Modal title={`Лист персонажа — ${selectedCharacter.name}`} onClose={() => setSelectedCharacter(null)}><CharacterSheet character={selectedCharacter} currentHp={sheetCurrentHp} temporaryHp={sheetTemporaryHp} onCurrentHpChange={setSheetCurrentHp} onTemporaryHpChange={setSheetTemporaryHp} onSave={saveCharacterHitPoints} onSaveData={saveCharacterSheetData} saving={sheetSaveBusy} error={sheetError} detailsError={sheetDetailsError}/></Modal>}
    {characterModal&&<Modal title="Новый персонаж" onClose={()=>setCharacterModal(false)}><form className="modal-form" onSubmit={createCharacter}><label>Имя персонажа<input autoFocus required value={characterName} onChange={e=>setCharacterName(e.target.value)} placeholder="Имя героя"/></label><label>Пол<select required value={characterGender} onChange={e=>setCharacterGender(e.target.value)}><option value="" disabled>Выбери вариант</option>{characterGenders.map(option=><option key={option} value={option}>{option}</option>)}</select></label><label>Раса<select required value={characterAncestry} onChange={e=>{setCharacterAncestry(e.target.value);setCharacterSubrace("");}}><option value="" disabled>Выбери расу</option>{characterAncestries.map(option=><option key={option} value={option}>{option}</option>)}</select></label>{(ancestrySubraces[characterAncestry] ?? []).length > 0 && <label>Подраса<select required value={characterSubrace} onChange={e=>setCharacterSubrace(e.target.value)}><option value="" disabled>Выбери подрасу</option>{(ancestrySubraces[characterAncestry] ?? []).map(option=><option key={option} value={option}>{option}</option>)}</select></label>}
    {characterAncestry==="Полуэльф"&&<div className="builder-section"><div><strong>Гибкое увеличение характеристик</strong><span>Полуэльф получает +1 к двум разным характеристикам, кроме Харизмы.</span></div><div className="ability-assignment"><label>Первое увеличение<select value={halfElfBonusOne} onChange={e=>setHalfElfBonusOne(e.target.value)}>{abilityFields.filter(a=>a.id!=="cha"&&a.id!==halfElfBonusTwo).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Второе увеличение<select value={halfElfBonusTwo} onChange={e=>setHalfElfBonusTwo(e.target.value)}>{abilityFields.filter(a=>a.id!=="cha"&&a.id!==halfElfBonusOne).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div></div>}<label>Класс персонажа<select required value={characterClass} onChange={e=>{setCharacterClass(e.target.value);setCharacterSkills([]);}}><option value="" disabled>Выбери класс</option>{characterClasses.map(option=><option key={option} value={option}>{option}</option>)}</select></label><label>Предыстория<select required value={characterBackground} onChange={e=>setCharacterBackground(e.target.value)}><option value="" disabled>Выбери предысторию</option>{characterBackgrounds.map(option=><option key={option} value={option}>{option}</option>)}</select></label><label>Мировоззрение<select required value={characterAlignment} onChange={e=>setCharacterAlignment(e.target.value)}><option value="" disabled>Выбери мировоззрение</option>{characterAlignments.map(option=><option key={option} value={option}>{option}</option>)}</select></label><div className="builder-section"><div><strong>Характеристики</strong><span>Стандартный набор 5e: 15, 14, 13, 12, 10, 8. Распредели каждое значение один раз.</span></div><div className="ability-assignment">{abilityFields.map(ability=><label key={ability.id}>{ability.name}<select value={characterAbilityScores[ability.id]} onChange={e=>setCharacterAbilityScores(current=>({...current,[ability.id]:Number(e.target.value)}))}>{standardArray.map(score=><option key={score} value={score}>{score} ({Math.floor((score-10)/2)>=0?"+":""}{Math.floor((score-10)/2)})</option>)}</select></label>)}</div>{new Set(Object.values(characterAbilityScores)).size!==6&&<small className="validation-note">Каждое значение стандартного набора должно использоваться ровно один раз.</small>}</div>
    {characterClass&&<div className="builder-section"><div><strong>Владения навыками</strong><span>Выбери {classSkillRules[characterClass]?.count??2} навыка из списка класса.</span></div><div className="skill-choice-grid">{(classSkillRules[characterClass]?.options??[]).map(id=>{const skill=skillCatalog.find(item=>item.id===id)!;const checked=characterSkills.includes(id);return <label className="skill-choice" key={id}><input type="checkbox" checked={checked} disabled={!checked&&characterSkills.length>=(classSkillRules[characterClass]?.count??2)} onChange={e=>setCharacterSkills(current=>e.target.checked?[...current,id]:current.filter(value=>value!==id))}/>{skill.name}</label>})}</div><small className="validation-note">Выбрано: {characterSkills.length} из {classSkillRules[characterClass]?.count??2}</small></div>}
    <div className="notice-strip"><Dice5 size={17}/><span>Спасброски класса будут отмечены автоматически. Бонус мастерства на 1-м уровне: +2. Снаряжение и заметки можно заполнить после создания в листе персонажа.</span></div>{characterError&&<p className="validation-note" role="alert">{characterError}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={()=>setCharacterModal(false)}>Отмена</button><button className="button button-primary" type="submit"><Plus size={16}/> Создать</button></div></form></Modal>}
  </div>;
}

function CharacterSheet({character,currentHp,temporaryHp,onCurrentHpChange,onTemporaryHpChange,onSave,onSaveData,saving,error,detailsError}:{character:Character;currentHp:string;temporaryHp:string;onCurrentHpChange:(value:string)=>void;onTemporaryHpChange:(value:string)=>void;onSave:(event:React.FormEvent)=>void;onSaveData:(data:Record<string,unknown>)=>Promise<boolean>;saving:boolean;error:string;detailsError:string}) {
  const data = character.rawData ?? {};
  const createTextDraft = () => Object.fromEntries([
    ...sheetListFields.map(field=>[field.key,toStringArray(data[field.key]).join("\n")]),
    ...sheetBiographyFields.map(field=>[field.key,typeof data[field.key]==="string" ? String(data[field.key]) : ""]),
  ]) as Record<typeof sheetListFields[number]["key"] | typeof sheetBiographyFields[number]["key"],string>;
  const [editing,setEditing] = useState(false);
  const [textDraft,setTextDraft] = useState(createTextDraft);
  const savedCurrency = (data.currency ?? {}) as Partial<Record<CurrencyKey,number>>;
  const createCurrencyDraft = () => Object.fromEntries(currencyKeys.map(key=>[key,String(savedCurrency[key] ?? 0)])) as Record<CurrencyKey,string>;
  const [currencyDraft,setCurrencyDraft] = useState(createCurrencyDraft);
  const [inspirationDraft,setInspirationDraft] = useState(data.inspiration === true);
  const [detailsFormError,setDetailsFormError] = useState("");
  const resetDetailsDraft = () => {
    setTextDraft(createTextDraft());
    setCurrencyDraft(createCurrencyDraft());
    setInspirationDraft(data.inspiration === true);
    setDetailsFormError("");
    setEditing(false);
  };
  const submitDetails = async (event:React.FormEvent) => {
    event.preventDefault();
    const currency = Object.fromEntries(currencyKeys.map(key=>[key,Number(currencyDraft[key])])) as Record<CurrencyKey,number>;
    if (currencyKeys.some(key=>!Number.isInteger(currency[key]) || currency[key] < 0)) {
      setDetailsFormError("Количество монет должно быть целым неотрицательным числом.");
      return;
    }
    const patch:Record<string,unknown> = {
      ...Object.fromEntries(sheetListFields.map(field=>[field.key,textDraft[field.key].split(/\r?\n/).map(value=>value.trim()).filter(Boolean)])),
      ...Object.fromEntries(sheetBiographyFields.map(field=>[field.key,textDraft[field.key].trim()])),
      currency,
      inspiration: inspirationDraft,
    };
    const saved = await onSaveData(patch);
    if (saved) setEditing(false);
  };
  const scores = character.abilityScores;
  const bonus = Number(data.proficiencyBonus ?? proficiencyBonusForLevel(character.level));
  const skillProficiencies = new Set(toStringArray(data.skillProficiencies ?? character.skillProficiencies));
  const skillExpertise = new Set(toStringArray(data.skillExpertise));
  const storedSaveProficiencies = toStringArray(data.savingThrowProficiencies);
  const saveProficiencies = new Set(storedSaveProficiencies.length ? storedSaveProficiencies : (classSavingThrows[character.className] ?? []));
  const modifier = (ability:string) => Math.floor(((scores[ability] ?? 10) - 10) / 2);
  const skillBonus = (skillId:string) => modifier(skillAbilities[skillId] ?? "wis") + (skillExpertise.has(skillId) ? bonus * 2 : skillProficiencies.has(skillId) ? bonus : 0);
  const hitPoints = (data.hitPoints ?? {}) as { maximum?: number; current?: number; temporary?: number };
  const maxHp = Number(hitPoints.maximum ?? character.derived.maxHp);
  const hitDice = (data.hitDice ?? {}) as { total?: number; remaining?: number; die?: string };
  const deathSaves = (data.deathSaves ?? {}) as { successes?: number; failures?: number };
  const listSection = (title:string, value:unknown) => {
    const values = toStringArray(value);
    return <section className="sheet-panel"><h3>{title}</h3>{values.length ? <ul className="sheet-text-list">{values.map((item,index)=><li key={`${title}-${index}`}>{item}</li>)}</ul> : <p className="sheet-muted">Пока не заполнено</p>}</section>;
  };
  return <div className="character-sheet">
    <div className="sheet-identity"><div><span className="sheet-kicker">ПЕРСОНАЖ · УРОВЕНЬ {character.level}</span><h2>{character.name}</h2><p>{[character.ancestry, character.subrace, character.className, character.background].filter(Boolean).join(" · ")}</p></div><div className="sheet-bonus"><span>Бонус мастерства</span><strong>{signedBonus(bonus)}</strong></div></div>
    <div className="sheet-combat-strip">
      <div><span>Класс доспеха</span><strong>{character.derived.armorClass}</strong></div>
      <div><span>Инициатива</span><strong>{signedBonus(character.derived.initiative)}</strong></div>
      <div><span>Скорость</span><strong>{character.derived.speed} фт.</strong></div>
      <div><span>Пассивное восприятие</span><strong>{Number(data.passivePerception ?? character.derived.passivePerception)}</strong></div>
    </div>
    <form className="sheet-hp-form" onSubmit={onSave}>
      <div className="sheet-hp-heading"><div><span className="sheet-kicker">СОСТОЯНИЕ</span><h3>Хиты</h3></div><span className="sheet-hp-total">{maxHp} максимум</span></div>
      <div className="sheet-hp-fields">
        <label>Текущие хиты<input type="number" min="0" max={maxHp} step="1" required value={currentHp} onChange={event=>onCurrentHpChange(event.target.value)}/></label>
        <label>Временные хиты<input type="number" min="0" step="1" required value={temporaryHp} onChange={event=>onTemporaryHpChange(event.target.value)}/></label>
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить хиты"}</button>
      </div>
      {error && <p className="validation-note" role="alert">{error}</p>}
      <p className="sheet-muted">Кость хитов: {hitDice.remaining ?? 1} из {hitDice.total ?? 1} {String(hitDice.die ?? character.derived.hitDie).replace(/^d/,"к")}</p>
    </form>
    <section className="sheet-panel"><h3>Характеристики</h3><div className="sheet-abilities">{abilityFields.map(ability=><div className="sheet-ability" key={ability.id}><span>{ability.name}</span><strong>{scores[ability.id] ?? 10}</strong><small>{signedBonus(modifier(ability.id))}</small></div>)}</div></section>
    <div className="sheet-two-columns">
      <section className="sheet-panel"><h3>Спасброски</h3><div className="sheet-roll-list">{abilityFields.map(ability=><div key={ability.id}><span className={saveProficiencies.has(ability.id) ? "is-proficient" : ""}>{saveProficiencies.has(ability.id) ? "●" : "○"}</span><b>{ability.name}</b><strong>{signedBonus(modifier(ability.id) + (saveProficiencies.has(ability.id) ? bonus : 0))}</strong></div>)}</div></section>
      <section className="sheet-panel"><h3>Навыки</h3><div className="sheet-roll-list">{skillCatalog.map(skill=><div key={skill.id}><span className={skillExpertise.has(skill.id) ? "is-expert" : skillProficiencies.has(skill.id) ? "is-proficient" : ""}>{skillExpertise.has(skill.id) ? "◆" : skillProficiencies.has(skill.id) ? "●" : "○"}</span><b>{skill.name}</b><small>{abilityFields.find(a=>a.id===skillAbilities[skill.id])?.name.slice(0,3) ?? "Муд"}</small><strong>{signedBonus(skillBonus(skill.id))}</strong></div>)}</div></section>
    </div>
    <section className="sheet-panel sheet-details-panel">
      <div className="sheet-details-heading"><div><h3>Снаряжение и записи</h3><p className="sheet-muted">Редактируй содержимое листа — изменения сохраняются в профиле персонажа.</p></div>
        <button type="button" className="button button-secondary sheet-edit-toggle" onClick={()=>editing?resetDetailsDraft():setEditing(true)}>{editing ? "Отменить" : "Редактировать"}</button>
      </div>
      {editing ? <form className="sheet-details-editor" onSubmit={submitDetails}>
        <div className="sheet-editor-grid">
          {sheetListFields.map(field=><label key={field.key}>{field.label}<textarea rows={3} value={textDraft[field.key]} onChange={event=>setTextDraft(current=>({...current,[field.key]:event.target.value}))} placeholder="Каждый пункт — с новой строки"/></label>)}
          {sheetBiographyFields.map(field=><label key={field.key}>{field.label}<textarea rows={2} value={textDraft[field.key]} onChange={event=>setTextDraft(current=>({...current,[field.key]:event.target.value}))} placeholder={field.label}/></label>)}
        </div>
        <div className="sheet-editor-subheading">Монеты</div>
        <div className="sheet-currency-editor">{currencyKeys.map(key=><label key={key}>{currencyLabels[key]}<input type="number" min="0" step="1" required value={currencyDraft[key]} onChange={event=>setCurrencyDraft(current=>({...current,[key]:event.target.value}))}/></label>)}</div>
        <label className="sheet-inspiration-toggle"><input type="checkbox" checked={inspirationDraft} onChange={event=>setInspirationDraft(event.target.checked)}/> Вдохновение</label>
        {(detailsFormError || detailsError) && <p className="validation-note" role="alert">{detailsFormError || detailsError}</p>}
        <div className="sheet-editor-actions"><button type="button" className="button button-secondary" onClick={resetDetailsDraft}>Отмена</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить лист"}</button></div>
      </form> : <>
        <div className="sheet-two-columns">
          {listSection("Снаряжение", data.equipment)}
          {listSection("Особенности и способности", data.features)}
          {listSection("Атаки", data.attacks)}
          {listSection("Заклинания", data.spells)}
          {listSection("Состояния", data.conditions)}
          {listSection("Языки", data.languages)}
        </div>
        <section className="sheet-panel sheet-currency-panel"><h3>Монеты</h3><div className="sheet-currency-list">{currencyKeys.map(key=><span key={key}><b>{currencyLabels[key]}</b>{Number(savedCurrency[key] ?? 0)}</span>)}</div></section>
        <section className="sheet-panel"><h3>Спасение от смерти</h3><div className="sheet-death-saves"><span>Успехи: {deathSaves.successes ?? 0}/3</span><span>Провалы: {deathSaves.failures ?? 0}/3</span><span>Вдохновение: {data.inspiration === true ? "Есть" : "Нет"}</span></div></section>
        {sheetBiographyFields.some(field=>typeof data[field.key]==="string" && String(data[field.key]).trim()) && <section className="sheet-panel"><h3>Описание персонажа</h3><div className="sheet-biography">{sheetBiographyFields.map(field=>typeof data[field.key]==="string" && String(data[field.key]).trim() ? <p key={field.key}><b>{field.label}:</b> {String(data[field.key])}</p> : null)}</div></section>}
      </>}
    </section>
  </div>;
}

function Dashboard({campaigns,characters,onCampaign,onCharacters,onCreate}:{campaigns:Campaign[];characters:Character[];onCampaign:()=>void;onCharacters:()=>void;onCreate:()=>void}) {
  return <><section className="welcome-row"><div><div className="eyebrow"><span/> ВАШЕ ПРИКЛЮЧЕНИЕ ПРОДОЛЖАЕТСЯ</div><h1>Добро пожаловать</h1><p className="subtitle">Собирай отряд, создавай героев и отправляйся навстречу неизвестному.</p></div><button className="button button-primary" onClick={onCreate}><Plus size={17}/> Создать кампанию</button></section>
    <section className="hero-panel"><div className="hero-content"><div className="hero-kicker"><Shield size={15}/> ПРОСТРАНСТВО ДЛЯ ТВОИХ ИСТОРИЙ</div><h2>Каждое великое<br/><em>приключение</em> начинается здесь.</h2><p>Создай собственный мир, собери друзей и расскажи историю, которую запомнят.</p><button className="button button-gold" onClick={onCampaign}>Открыть кампании <Compass size={16}/></button></div><div className="hero-art" aria-hidden="true"><div className="rune rune-one">✦</div><div className="rune rune-two">✧</div><div className="orb"><Dice5 size={74} strokeWidth={1}/></div><div className="orbit orbit-one"/><div className="orbit orbit-two"/></div></section>
    <div className="section-heading"><div><h2>Быстрый доступ</h2><p>Всё необходимое для следующего шага</p></div><button className="text-button" onClick={onCampaign}>Все разделы <span>→</span></button></div>
    <section className="quick-grid"><button className="quick-card" onClick={onCampaign}><div className="quick-icon gold-icon"><Swords size={21}/></div><div><strong>Мои кампании</strong><span>{campaigns.length} создано</span></div><span className="card-arrow">↗</span></button><button className="quick-card" onClick={onCharacters}><div className="quick-icon blue-icon"><Users size={21}/></div><div><strong>Мои персонажи</strong><span>{characters.length} в коллекции</span></div><span className="card-arrow">↗</span></button><button className="quick-card" onClick={onCampaign}><div className="quick-icon purple-icon"><BookOpen size={21}/></div><div><strong>Игровая библиотека</strong><span>Справочные материалы</span></div><span className="card-arrow">↗</span></button></section>
    <div className="lower-grid"><section className="empty-panel"><div className="panel-title"><div><h3>Последние кампании</h3><p>Твои недавние приключения</p></div><ScrollText size={19}/></div>{campaigns.length===0?<div className="empty-state"><div className="empty-emblem"><Swords size={25}/></div><strong>Здесь появятся твои кампании</strong><span>Создай первую кампанию или присоединись к приключению друзей.</span><button className="button button-secondary" onClick={onCreate}><Plus size={16}/> Начать</button></div>:<div className="mini-list">{campaigns.slice(-3).reverse().map(c=><div key={c.id}><Swords size={16}/><span>{c.name}</span><small>{c.access}</small></div>)}</div>}</section><section className="empty-panel activity-panel"><div className="panel-title"><div><h3>Путевой журнал</h3><p>Важные события и уведомления</p></div><Bell size={18}/></div><div className="journal-empty"><div className="journal-line"/><span>Пока нет новых событий</span></div><div className="tip-box"><Sparkles size={17}/><span>Создай персонажа заранее, чтобы быстрее присоединиться к игре.</span></div></section></div></>;
}
function EmptyState({icon,title,description,action,onAction}:{icon:React.ReactNode;title:string;description:string;action:string;onAction:()=>void}){return <div className="large-empty"><div className="empty-emblem">{icon}</div><h3>{title}</h3><p>{description}</p><button className="button button-primary" onClick={onAction}><Plus size={16}/>{action}</button></div>}
function Modal({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="modal-card" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={18}/></button></div>{children}</section></div>}
export default App;
