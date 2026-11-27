import { useState } from "react";
import {
  BookOpen, ChevronDown, Compass, Dice5, LayoutDashboard,
  Menu, Plus, Search, Settings, Shield, Sparkles, Swords,
  Users, UserRound, Bell, ScrollText, X
} from "lucide-react";

type Section = "Главная" | "Кампании" | "Персонажи" | "Библиотека" | "Настройки";

const navigation: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Главная", icon: LayoutDashboard },
  { label: "Кампании", icon: Swords },
  { label: "Персонажи", icon: UserRound },
  { label: "Библиотека", icon: BookOpen },
  { label: "Настройки", icon: Settings }
];

function App() {
  const [active, setActive] = useState<Section>("Главная");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Swords size={23} /></div>
          <div><strong>DnD_Dcorp</strong><span>ПРИКЛЮЧЕНИЯ НАЧИНАЮТСЯ ЗДЕСЬ</span></div>
          <button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Закрыть меню"><X size={18}/></button>
        </div>
        <div className="nav-caption">РАЗДЕЛЫ</div>
        <nav className="main-nav" aria-label="Основная навигация">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${active === label ? "active" : ""}`} onClick={() => { setActive(label); setMenuOpen(false); }}>
              <Icon size={18} /><span>{label}</span>{active === label && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><Sparkles size={17}/><p>Твоя история. Твои решения. Твой мир.</p></div>
          <div className="profile-mini"><div className="avatar">П</div><div><strong>Путешественник</strong><span>Личный кабинет</span></div><ChevronDown size={16}/></div>
        </div>
      </aside>

      {menuOpen && <button className="scrim" aria-label="Закрыть меню" onClick={() => setMenuOpen(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Открыть меню"><Menu size={20}/></button>
          <div className="breadcrumbs"><span>DnD_Dcorp</span><span className="crumb-separator">/</span><strong>{active}</strong></div>
          <div className="top-actions">
            <button className="icon-button search-button" aria-label="Поиск"><Search size={18}/></button>
            <button className="icon-button notification-button" aria-label="Уведомления"><Bell size={18}/><i/></button>
            <div className="top-avatar">П</div>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div><div className="eyebrow"><span/> ВАШЕ ПРИКЛЮЧЕНИЕ ПРОДОЛЖАЕТСЯ</div><h1>{active === "Главная" ? "Добро пожаловать" : active}</h1><p className="subtitle">Собирай отряд, создавай героев и отправляйся навстречу неизвестному.</p></div>
            <button className="button button-primary" onClick={() => setActive("Кампании")}><Plus size={17}/> Создать кампанию</button>
          </section>

          <section className="hero-panel">
            <div className="hero-content">
              <div className="hero-kicker"><Shield size={15}/> ПРОСТРАНСТВО ДЛЯ ТВОИХ ИСТОРИЙ</div>
              <h2>Каждое великое<br/><em>приключение</em> начинается здесь.</h2>
              <p>Создай собственный мир, собери друзей и расскажи историю, которую запомнят.</p>
              <button className="button button-gold" onClick={() => setActive("Кампании")}>Открыть кампании <Compass size={16}/></button>
            </div>
            <div className="hero-art" aria-hidden="true"><div className="rune rune-one">✦</div><div className="rune rune-two">✧</div><div className="orb"><Dice5 size={74} strokeWidth={1}/></div><div className="orbit orbit-one"/><div className="orbit orbit-two"/></div>
          </section>

          <div className="section-heading"><div><h2>Быстрый доступ</h2><p>Всё необходимое для следующего шага</p></div><button className="text-button" onClick={() => setActive("Кампании")}>Все разделы <span>→</span></button></div>
          <section className="quick-grid">
            <button className="quick-card" onClick={() => setActive("Кампании")}><div className="quick-icon gold-icon"><Swords size={21}/></div><div><strong>Мои кампании</strong><span>Управление приключениями</span></div><span className="card-arrow">↗</span></button>
            <button className="quick-card" onClick={() => setActive("Персонажи")}><div className="quick-icon blue-icon"><Users size={21}/></div><div><strong>Мои персонажи</strong><span>Герои и листы персонажей</span></div><span className="card-arrow">↗</span></button>
            <button className="quick-card" onClick={() => setActive("Библиотека")}><div className="quick-icon purple-icon"><BookOpen size={21}/></div><div><strong>Библиотека</strong><span>Правила и игровые материалы</span></div><span className="card-arrow">↗</span></button>
          </section>

          <div className="lower-grid">
            <section className="empty-panel"><div className="panel-title"><div><h3>Последние кампании</h3><p>Твои недавние приключения</p></div><ScrollText size={19}/></div><div className="empty-state"><div className="empty-emblem"><Swords size={25}/></div><strong>Здесь появятся твои кампании</strong><span>Создай первую кампанию или присоединись к приключению друзей.</span><button className="button button-secondary" onClick={() => setActive("Кампании")}><Plus size={16}/> Начать</button></div></section>
            <section className="empty-panel activity-panel"><div className="panel-title"><div><h3>Путевой журнал</h3><p>Важные события и уведомления</p></div><Bell size={18}/></div><div className="journal-empty"><div className="journal-line"/><span>Пока нет новых событий</span></div><div className="tip-box"><Sparkles size={17}/><span>Совет: создай персонажа заранее, чтобы быстрее присоединиться к игре.</span></div></section>
          </div>
          <footer>DnD_Dcorp <span>•</span> Пространство для настольных приключений</footer>
        </div>
      </main>
    </div>
  );
}

export default App;