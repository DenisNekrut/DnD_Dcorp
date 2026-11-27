import { useEffect, useState } from "react";
import { apiRequest, isApiConfigured } from "./api";
import GameTable from "./GameTable";
import {
  BookOpen, ChevronDown, Compass, Dice5, LayoutDashboard, Menu, Plus,
  Search, Settings, Shield, Sparkles, Swords, Users, UserRound, Bell,
  ScrollText, X, LockKeyhole, Globe2, Copy, MoreHorizontal, WandSparkles
} from "lucide-react";

type Section = "Главная" | "Кампании" | "Игровой стол" | "Персонажи" | "Библиотека" | "Настройки";
type Campaign = { id: string; name: string; description: string; access: "Открытая" | "По приглашению"; players: number };
type Character = { id: string | number; name: string; gender: string; ancestry: string; subrace: string; className: string; background: string; alignment: string; level: number; abilityScores: Record<string, number>; skillProficiencies: string[]; derived: { maxHp:number; armorClass:number; initiative:number; speed:number; passivePerception:number; hitDie:string } };

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
  { label: "Главная", icon: LayoutDashboard }, { label: "Кампании", icon: Swords }, { label: "Игровой стол", icon: Dice5 },
  { label: "Персонажи", icon: UserRound }, { label: "Библиотека", icon: BookOpen },
  { label: "Настройки", icon: Settings }
];

type SessionUser = { id: string; email: string; username: string };
type ApiCharacter = { id: string; name: string; data: Record<string, unknown> };
type ApiCampaign = { id: string; name: string; description?: string | null; applicationsOpen?: boolean; memberships?: Array<{ status: string }>; _count?: { memberships?: number } };

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
    derived: {
      maxHp: Number(hp.maximum ?? 1), armorClass: Number(data.armorClass ?? 10),
      initiative: Number(data.initiative ?? 0), speed: Number(data.speed ?? 30),
      passivePerception: Number(data.passivePerception ?? 10), hitDie: String(hitDice.die ?? "d8").replace("d", "к"),
    },
  };
}

function App() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
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
  const [characters, setCharacters] = useState<Character[]>([]);
  const [campaignModal, setCampaignModal] = useState(false);
  const [campaignError, setCampaignError] = useState("");
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [characterModal, setCharacterModal] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [campaignAccess, setCampaignAccess] = useState<"Открытая" | "По приглашению">("По приглашению");
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

  useEffect(() => {
    if (!isApiConfigured()) { setAuthLoading(false); return; }
    apiRequest<{ user: SessionUser }>("/auth/me")
      .then(result => setSessionUser(result.user))
      .catch(() => setSessionUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!sessionUser) { setCharacters([]); setCampaigns([]); return; }
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
      }))))
      .catch(error => setCampaignError(error instanceof Error ? error.message : "Не удалось загрузить кампании."));
  }, [sessionUser]);

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
    try { await apiRequest("/auth/logout", { method: "POST" }); }
    finally { setSessionUser(null); setCharacters([]); setAuthError(""); }
  };

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    setCampaignError("");
    if (campaignName.trim().length < 2) { setCampaignError("Название должно содержать не менее двух символов."); return; }
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
      }]);
      setCampaignName(""); setCampaignDescription(""); setCampaignModal(false);
    } catch (error) {
      setCampaignError(error instanceof Error ? error.message : "Не удалось создать кампанию. Попробуй ещё раз.");
    } finally { setCampaignBusy(false); }
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
      const saved = await apiRequest<ApiCharacter>("/characters/personal", {
        method: "POST",
        body: JSON.stringify({
          name: characterName.trim(),
          data: {
            gender: characterGender, ancestry: characterAncestry, species: characterAncestry,
            subrace: characterSubrace, characterClass, background: characterBackground,
            alignment: characterAlignment, level: 1, abilityScores: finalScores,
            skillProficiencies: characterSkills, savingThrowProficiencies: [],
            armorClass: 10 + dexMod, speed, hitPoints: { maximum: maximumHp, current: maximumHp, temporary: 0 },
            hitDice: { total: 1, remaining: 1, die: `d${hitDie}` },
          },
        }),
      });
      setCharacters(items => [mapApiCharacter(saved), ...items]);
    } catch (error) {
      setCharacterError(error instanceof Error ? error.message : "Не удалось сохранить персонажа. Проверь соединение с сервером.");
      return;
    }
    setCharacterName(""); setCharacterGender(""); setCharacterAncestry(""); setCharacterClass(""); setCharacterSubrace(""); setCharacterBackground(""); setCharacterAlignment(""); setCharacterAbilityScores({str:15,dex:14,con:13,int:12,wis:10,cha:8}); setCharacterSkills([]); setHalfElfBonusOne("str"); setHalfElfBonusTwo("dex"); setCharacterError(""); setCharacterModal(false);
  };

  if (authLoading) return <div className="auth-screen"><section className="auth-card"><h1>DnD_Dcorp</h1><p>Проверяем подключение к аккаунту…</p></section></div>;
  if (!apiReady) return <div className="auth-screen"><section className="auth-card"><h1>DnD_Dcorp</h1><p>Сервер приложения пока не настроен.</p><p className="auth-hint">Для входа и сохранения персонажей необходимо указать адрес API в переменной окружения <code>VITE_API_URL</code>. Гостевой режим отключён.</p></section></div>;
  if (!sessionUser) return <div className="auth-screen"><section className="auth-card"><div className="eyebrow"><span/> ЛИЧНЫЙ АККАУНТ</div><h1>{authMode === "login" ? "С возвращением" : "Создать аккаунт"}</h1><p>Войди, чтобы сохранять персонажей и участвовать в кампаниях.</p><form className="modal-form" onSubmit={submitAuth}>
    <label>Электронная почта<input type="email" required autoComplete="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="name@example.com"/></label>
    {authMode === "register" && <label>Имя пользователя<input required minLength={3} maxLength={32} value={authUsername} onChange={e=>setAuthUsername(e.target.value)} placeholder="Имя в игре"/></label>}
    <label>Пароль<input type="password" required minLength={12} maxLength={128} autoComplete={authMode === "login" ? "current-password" : "new-password"} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Не менее 12 символов"/></label>
    {authError && <p className="validation-note" role="alert">{authError}</p>}
    <button className="button button-primary full-width" type="submit" disabled={authBusy}>{authBusy ? "Подождите…" : authMode === "login" ? "Войти" : "Зарегистрироваться"}</button>
  </form><button className="text-button auth-switch" onClick={()=>{setAuthMode(authMode==="login"?"register":"login");setAuthError("");}}>{authMode==="login"?"Нет аккаунта? Зарегистрироваться":"Уже есть аккаунт? Войти"}</button></section></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Swords size={23}/></div><div><strong>DnD_Dcorp</strong><span>ПРИКЛЮЧЕНИЯ НАЧИНАЮТСЯ ЗДЕСЬ</span></div><button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Закрыть меню"><X size={18}/></button></div>
      <div className="nav-caption">РАЗДЕЛЫ</div>
      <nav className="main-nav" aria-label="Основная навигация">{navigation.map(({label,icon:Icon})=><button key={label} className={`nav-item ${active===label?"active":""}`} onClick={()=>{setActive(label);setMenuOpen(false);}}><Icon size={18}/><span>{label}</span>{active===label&&<span className="nav-indicator"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><Sparkles size={17}/><p>Твоя история. Твои решения. Твой мир.</p></div><div className="profile-mini"><div className="avatar">{sessionUser.username.slice(0,1).toUpperCase()}</div><div><strong>{sessionUser.username}</strong><span>Аккаунт</span></div><ChevronDown size={16}/></div></div>
    </aside>
    {menuOpen&&<button className="scrim" aria-label="Закрыть меню" onClick={()=>setMenuOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-button menu-toggle" onClick={()=>setMenuOpen(true)} aria-label="Открыть меню"><Menu size={20}/></button><div className="breadcrumbs"><span>DnD_Dcorp</span><span className="crumb-separator">/</span><strong>{active}</strong></div><div className="top-actions"><button className="icon-button search-button" aria-label="Поиск"><Search size={18}/></button><button className="icon-button notification-button" aria-label="Уведомления"><Bell size={18}/><i/></button><button className="top-avatar" title={sessionUser.username} onClick={logout}>{sessionUser.username.slice(0,1).toUpperCase()}</button></div></header>
      <div className="content">
        {active==="Главная"&&<Dashboard campaigns={campaigns} characters={characters} onCampaign={()=>setActive("Кампании")} onCharacters={()=>setActive("Персонажи")} onCreate={()=>setCampaignModal(true)}/>}
        {active==="Кампании"&&<section className="page-section">
          <div className="page-heading"><div><div className="eyebrow"><span/> СОВМЕСТНЫЕ ПРИКЛЮЧЕНИЯ</div><h1>Кампании</h1><p className="subtitle">Создавай игровые миры или присоединяйся к приключениям.</p></div><button className="button button-primary" onClick={()=>setCampaignModal(true)}><Plus size={17}/> Создать кампанию</button></div>
          <div className="toolbar"><div className="search-field"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск среди моих кампаний"/></div><span className="muted-count">{campaigns.length} кампаний</span></div>
          {campaigns.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())).length===0?<EmptyState icon={<Swords size={26}/>} title="Пока нет кампаний" description="Создай первую кампанию. Здесь появятся твои игровые миры и приглашения." action="Создать кампанию" onAction={()=>setCampaignModal(true)}/>:<div className="entity-grid">{campaigns.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())).map(c=><article className="entity-card" key={c.id}><div className="entity-card-top"><div className="quick-icon gold-icon"><Swords size={22}/></div><span className="status-pill">{c.access==="Открытая"?<Globe2 size={13}/>:<LockKeyhole size={13}/>} {c.access}</span><button className="icon-button compact" aria-label="Дополнительные действия"><MoreHorizontal size={18}/></button></div><h3>{c.name}</h3><p>{c.description||"Описание кампании пока не добавлено."}</p><div className="entity-meta"><span><Users size={14}/> {c.players} участник</span><span>Система: 5e</span></div><button className="button button-secondary full-width" onClick={() => { setSelectedCampaign(c); setActive("Игровой стол"); }}>Открыть игровой стол <Compass size={15}/></button><small className="prototype-note">Открывает интерактивную сцену кампании</small></article>)}</div>}
          <div className="join-panel"><div className="join-icon"><Copy size={19}/></div><div><strong>Есть приглашение?</strong><span>Вставь пригласительную ссылку или код, чтобы отправить заявку на вступление.</span></div><button className="button button-secondary" disabled>Ввести приглашение</button></div>
        </section>}
        {active==="Игровой стол"&&<GameTable campaignName={selectedCampaign?.name ?? "Демонстрационная сцена"} onBack={()=>setActive("Кампании")}/>}
        {active==="Персонажи"&&<section className="page-section">
          <div className="page-heading"><div><div className="eyebrow"><span/> ТВОИ ГЕРОИ</div><h1>Персонажи</h1><p className="subtitle">Личная коллекция героев для будущих приключений.</p></div><button className="button button-primary" onClick={()=>setCharacterModal(true)}><Plus size={17}/> Создать персонажа</button></div>
          <div className="notice-strip"><Shield size={17}/><span>Личные карточки сохраняются в аккаунте и не зависят от копий персонажей в кампаниях.</span></div>{authError && <p className="validation-note" role="alert">{authError}</p>}
          {characters.length===0?<EmptyState icon={<UserRound size={26}/>} title="Твоя коллекция пока пуста" description="Создай первого героя. Позже здесь появится полный лист персонажа с характеристиками, навыками, снаряжением и способностями." action="Создать персонажа" onAction={()=>setCharacterModal(true)}/>:<div className="character-grid">{characters.map(c=><article className="character-card" key={c.id}><div className="character-art"><div className="character-sigil"><UserRound size={35}/></div><span>УРОВЕНЬ {c.level}</span></div><div className="character-info"><h3>{c.name}</h3><p>{c.gender} · {c.ancestry}{c.subrace ? ` (${c.subrace})` : ""} · {c.className}</p><p className="character-background">{c.background} · {c.alignment}</p><div className="ability-preview">{abilityFields.map(ability=><span key={ability.id}><b>{ability.name}</b>{c.abilityScores[ability.id]} <small>{Math.floor((c.abilityScores[ability.id]-10)/2)>=0?"+":""}{Math.floor((c.abilityScores[ability.id]-10)/2)}</small></span>)}</div><div className="skill-preview"><b>Владения навыками</b><span>{c.skillProficiencies.map(id=>skillCatalog.find(skill=>skill.id===id)?.name).join(", ")}</span></div><div className="derived-preview"><span><b>ХИТЫ</b>{c.derived.maxHp}</span><span><b>КД</b>{c.derived.armorClass}</span><span><b>ИНИЦИАТИВА</b>{c.derived.initiative>=0?"+":""}{c.derived.initiative}</span><span><b>СКОРОСТЬ</b>{c.derived.speed} фт.</span><span><b>ПАСС. ВОСПРИЯТИЕ</b>{c.derived.passivePerception}</span><span><b>КОСТЬ ХИТОВ</b>{c.derived.hitDie}</span></div><div className="stat-preview"><span><b>КЛАСС</b>{c.className}</span><span><b>УРОВЕНЬ</b>{c.level}</span><span><b>СОСТОЯНИЕ</b>Личный</span></div><button className="button button-secondary full-width" disabled>Открыть лист персонажа</button><small className="prototype-note">Редактор листа будет реализован следующим этапом</small></div></article>)}</div>}
        </section>}
        {active==="Библиотека"&&<section className="page-section"><div className="page-heading"><div><div className="eyebrow"><span/> СПРАВОЧНЫЕ МАТЕРИАЛЫ</div><h1>Библиотека</h1><p className="subtitle">Игровые справочники и материалы кампаний.</p></div></div><div className="library-grid">{[{title:"Персонажи",desc:"Классы, происхождения, предыстории и развитие.",icon:<UserRound/>},{title:"Существа",desc:"Противники, союзники и игровые характеристики.",icon:<Swords/>},{title:"Заклинания",desc:"Магические эффекты и правила их применения.",icon:<WandSparkles/>},{title:"Предметы",desc:"Снаряжение, оружие, доспехи и сокровища.",icon:<Shield/>}].map(x=><article className="library-card" key={x.title}><div className="quick-icon purple-icon">{x.icon}</div><h3>{x.title}</h3><p>{x.desc}</p><span className="coming-label">Раздел готовится</span></article>)}</div></section>}
        {active==="Настройки"&&<section className="page-section"><div className="page-heading"><div><div className="eyebrow"><span/> УПРАВЛЕНИЕ АККАУНТОМ</div><h1>Настройки</h1><p className="subtitle">Параметры профиля и приложения.</p></div></div><div className="settings-card"><div className="settings-avatar">П</div><div><h3>Демо-профиль</h3><p>Авторизация и профиль будут подключены вместе с серверной частью.</p><span className="status-pill">Локальный прототип</span></div></div></section>}
        <footer>DnD_Dcorp <span>•</span> Пространство для настольных приключений</footer>
      </div>
    </main>
    {campaignModal&&<Modal title="Новая кампания" onClose={()=>setCampaignModal(false)}><form className="modal-form" onSubmit={createCampaign}><label>Название кампании<input autoFocus required value={campaignName} onChange={e=>setCampaignName(e.target.value)} placeholder="Например, Тайны старого королевства"/></label><label>Краткое описание<textarea value={campaignDescription} onChange={e=>setCampaignDescription(e.target.value)} placeholder="О чём будет это приключение?"/></label><p className="notice-strip">Кампания будет сохранена на сервере и появится в твоём списке. Настройки приватности и пароль добавим в управлении кампанией.</p>{campaignError&&<p className="validation-note" role="alert">{campaignError}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={()=>setCampaignModal(false)}>Отмена</button><button className="button button-primary" type="submit" disabled={campaignBusy}>{campaignBusy?"Сохранение…":<><Plus size={16}/> Создать</>}</button></div></form></Modal>}
    {characterModal&&<Modal title="Новый персонаж" onClose={()=>setCharacterModal(false)}><form className="modal-form" onSubmit={createCharacter}><label>Имя персонажа<input autoFocus required value={characterName} onChange={e=>setCharacterName(e.target.value)} placeholder="Имя героя"/></label><label>Пол<select required value={characterGender} onChange={e=>setCharacterGender(e.target.value)}><option value="" disabled>Выбери вариант</option>{characterGenders.map(option=><option key={option} value={option}>{option}</option>)}</select></label><label>Раса<select required value={characterAncestry} onChange={e=>{setCharacterAncestry(e.target.value);setCharacterSubrace("");}}><option value="" disabled>Выбери расу</option>{characterAncestries.map(option=><option key={option} value={option}>{option}</option>)}</select></label>{(ancestrySubraces[characterAncestry] ?? []).length > 0 && <label>Подраса<select required value={characterSubrace} onChange={e=>setCharacterSubrace(e.target.value)}><option value="" disabled>Выбери подрасу</option>{(ancestrySubraces[characterAncestry] ?? []).map(option=><option key={option} value={option}>{option}</option>)}</select></label>}
    {characterAncestry==="Полуэльф"&&<div className="builder-section"><div><strong>Гибкое увеличение характеристик</strong><span>Полуэльф получает +1 к двум разным характеристикам, кроме Харизмы.</span></div><div className="ability-assignment"><label>Первое увеличение<select value={halfElfBonusOne} onChange={e=>setHalfElfBonusOne(e.target.value)}>{abilityFields.filter(a=>a.id!=="cha"&&a.id!==halfElfBonusTwo).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Второе увеличение<select value={halfElfBonusTwo} onChange={e=>setHalfElfBonusTwo(e.target.value)}>{abilityFields.filter(a=>a.id!=="cha"&&a.id!==halfElfBonusOne).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div></div>}<label>Класс персонажа<select required value={characterClass} onChange={e=>{setCharacterClass(e.target.value);setCharacterSkills([]);}}><option value="" disabled>Выбери класс</option>{characterClasses.map(option=><option key={option} value={option}>{option}</option>)}</select></label><label>Предыстория<select required value={characterBackground} onChange={e=>setCharacterBackground(e.target.value)}><option value="" disabled>Выбери предысторию</option>{characterBackgrounds.map(option=><option key={option} value={option}>{option}</option>)}</select></label><label>Мировоззрение<select required value={characterAlignment} onChange={e=>setCharacterAlignment(e.target.value)}><option value="" disabled>Выбери мировоззрение</option>{characterAlignments.map(option=><option key={option} value={option}>{option}</option>)}</select></label><div className="builder-section"><div><strong>Характеристики</strong><span>Стандартный набор 5e: 15, 14, 13, 12, 10, 8. Распредели каждое значение один раз.</span></div><div className="ability-assignment">{abilityFields.map(ability=><label key={ability.id}>{ability.name}<select value={characterAbilityScores[ability.id]} onChange={e=>setCharacterAbilityScores(current=>({...current,[ability.id]:Number(e.target.value)}))}>{standardArray.map(score=><option key={score} value={score}>{score} ({Math.floor((score-10)/2)>=0?"+":""}{Math.floor((score-10)/2)})</option>)}</select></label>)}</div>{new Set(Object.values(characterAbilityScores)).size!==6&&<small className="validation-note">Каждое значение стандартного набора должно использоваться ровно один раз.</small>}</div>
    {characterClass&&<div className="builder-section"><div><strong>Владения навыками</strong><span>Выбери {classSkillRules[characterClass]?.count??2} навыка из списка класса.</span></div><div className="skill-choice-grid">{(classSkillRules[characterClass]?.options??[]).map(id=>{const skill=skillCatalog.find(item=>item.id===id)!;const checked=characterSkills.includes(id);return <label className="skill-choice" key={id}><input type="checkbox" checked={checked} disabled={!checked&&characterSkills.length>=(classSkillRules[characterClass]?.count??2)} onChange={e=>setCharacterSkills(current=>e.target.checked?[...current,id]:current.filter(value=>value!==id))}/>{skill.name}</label>})}</div><small className="validation-note">Выбрано: {characterSkills.length} из {classSkillRules[characterClass]?.count??2}</small></div>}
    <div className="notice-strip"><Dice5 size={17}/><span>Спасброски класса будут отмечены автоматически. Бонус мастерства на 1-м уровне: +2. Остальные расчёты и снаряжение будут добавлены в листе персонажа.</span></div>{characterError&&<p className="validation-note" role="alert">{characterError}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={()=>setCharacterModal(false)}>Отмена</button><button className="button button-primary" type="submit"><Plus size={16}/> Создать</button></div></form></Modal>}
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
