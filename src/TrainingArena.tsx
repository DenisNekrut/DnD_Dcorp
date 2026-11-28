import { useMemo, useState } from "react";
import { Dumbbell, Shield, Swords, Heart, RotateCcw, Dice5, Activity, Target } from "lucide-react";

type TrainingCharacter = {
  id: string | number; name: string; className: string; level: number;
  abilityScores: Record<string, number>;
  skillProficiencies: string[];
  rawData?: Record<string, unknown>;
  derived: { maxHp: number; armorClass: number; speed: number };
};
type Props = { characters: TrainingCharacter[] };
type TargetMode = "dummy" | "orc";
const abilityList = [{id:"str",name:"Сила"},{id:"dex",name:"Ловкость"},{id:"con",name:"Телосложение"},{id:"int",name:"Интеллект"},{id:"wis",name:"Мудрость"},{id:"cha",name:"Харизма"}];
const mod = (score:number) => Math.floor(((Number.isFinite(score) ? score : 10) - 10) / 2);
const d = (sides:number) => Math.floor(Math.random()*sides)+1;
const readNames = (value:unknown):string[] => Array.isArray(value) ? value.map(item => typeof item === "string" ? item : item && typeof item === "object" ? String((item as Record<string,unknown>).name ?? (item as Record<string,unknown>).title ?? "") : "").filter(Boolean) : [];

export default function TrainingArena({characters}:Props) {
  const [heroId,setHeroId] = useState<string>(characters[0] ? String(characters[0].id) : "");
  const hero = characters.find(item=>String(item.id)===heroId) ?? characters[0];
  const [target,setTarget] = useState<TargetMode>("dummy");
  const [targetHp,setTargetHp] = useState(30);
  const [heroHp,setHeroHp] = useState(hero?.derived.maxHp ?? 1);
  const [tempHp,setTempHp] = useState(0);
  const [log,setLog] = useState<string[]>(["Тренировка готова. Все изменения существуют только в этой тренировочной сцене."]);
  const [ability,setAbility] = useState("str");
  const [customName,setCustomName] = useState("");
  const [customBonus,setCustomBonus] = useState("0");
  const [customDc,setCustomDc] = useState("12");
  const [round,setRound] = useState(1);
  const [lastDamage,setLastDamage] = useState(0);

  const data = hero?.rawData ?? {};
  const actions = useMemo(()=>[
    ...readNames(data.features).map(name=>({name,kind:"Особенность"})),
    ...readNames(data.spells).map(name=>({name,kind:"Заклинание"})),
    ...readNames(data.attacks).map(name=>({name,kind:"Атака"})),
  ].filter((item,index,all)=>all.findIndex(other=>other.name===item.name)===index),[hero]);
  const hpMax = Math.max(1,hero?.derived.maxHp ?? 1);
  const armorClass = hero?.derived.armorClass ?? 10;
  const reset = (nextTarget:TargetMode=target) => {
    setTarget(nextTarget); setTargetHp(nextTarget==="orc"?30:9999); setHeroHp(hpMax); setTempHp(0); setRound(1); setLastDamage(0);
    setLog([nextTarget==="orc"?"Новый бой: агрессивный орк готов атаковать.":"Новая тренировка: манекен не атакует и не имеет лимита прочности."]);
  };
  const addLog = (line:string) => setLog(current=>[line,...current].slice(0,12));
  const rollAbility = () => {
    if(!hero) return;
    const score=Number(hero.abilityScores[ability]??10), bonus=mod(score), die=d(20), total=die+bonus, dc=Math.max(1,Number(customDc)||12);
    addLog(`${abilityList.find(item=>item.id===ability)?.name}: d20 (${die}) ${bonus>=0?"+":""}${bonus} = ${total} против СЛ ${dc} — ${total>=dc?"успех":"неудача"}.`);
  };
  const testAction = (name:string,kind:string) => {
    if(!hero) return;
    const die=d(20), bonus=mod(Number(hero.abilityScores.str??10))+(Math.floor((hero.level-1)/4)+2);
    const hit=die===20 || (die!==1 && die+bonus >= (target==="orc"?13:10));
    const damage=hit ? d(8)+Math.max(0,mod(Number(hero.abilityScores.str??10))) : 0;
    if(target==="orc" && hit) setTargetHp(current=>Math.max(0,current-damage));
    addLog(`${kind}: «${name}» — d20 ${die} + ${bonus} = ${die+bonus}; ${hit?"попадание":"промах"}${hit?`, урон ${damage}`:""}.`);
  };
  const orcAttack = () => {
    if(target!=="orc" || targetHp<=0 || heroHp<=0) return;
    const die=d(20), total=die+5, hit=die===20 || (die!==1 && total>=armorClass), damage=hit?d(8)+3:0;
    const absorbed=Math.min(tempHp,damage), remaining=damage-absorbed;
    setTempHp(value=>value-absorbed); setHeroHp(value=>Math.max(0,value-remaining)); setLastDamage(damage);
    setRound(value=>value+1);
    addLog(`Орк атакует: d20 ${die} + 5 = ${total} против КД ${armorClass} — ${hit?`попадание, ${damage} урона (временные хиты поглотили ${absorbed})`:"промах"}.`);
  };
  const useTempHp = () => { const amount=Math.max(0,Number(customBonus)||0); setTempHp(amount); addLog(`Установлено ${amount} временных хитов для теста.`); };
  if(!hero) return <section className="training-page"><div className="training-heading"><div className="training-icon"><Dumbbell/></div><div><div className="eyebrow"><span/> ПОЛИГОН</div><h1>Тренировка</h1><p>Проверь способности героев в безопасной тренировочной сцене.</p></div></div><div className="training-empty"><Swords size={32}/><h2>Пока нет персонажей</h2><p>Создай героя в разделе «Персонажи», и он появится здесь для тренировок.</p></div></section>;
  return <section className="training-page">
    <div className="training-heading"><div className="training-icon"><Dumbbell/></div><div><div className="eyebrow"><span/> ПОЛИГОН</div><h1>Тренировка</h1><p>Выбери героя, испытание и проверь его возможности. Результаты не меняют лист персонажа.</p></div></div>
    <div className="training-layout">
      <section className="training-panel training-controls">
        <div className="training-panel-title"><h2>Участник тренировки</h2><span>ГЕРОЙ</span></div>
        <label className="training-field">Персонаж<select value={heroId} onChange={event=>{setHeroId(event.target.value);const next=characters.find(item=>String(item.id)===event.target.value);setHeroHp(next?.derived.maxHp??1);setTempHp(0);setLog(["Выбран новый герой. Тренировочные показатели сброшены."]);}}>{characters.map(item=><option key={item.id} value={String(item.id)}>{item.name} · {item.className} {item.level} ур.</option>)}</select></label>
        <div className="training-hero-stats"><div><span>Уровень</span><strong>{hero.level}</strong></div><div><span>Класс защиты</span><strong>{armorClass}</strong></div><div><span>Скорость</span><strong>{Number((hero.derived.speed * 0.3).toFixed(1))} м</strong></div></div>
        <div className="training-panel-title"><h2>Тип испытания</h2></div>
        <div className="training-targets"><button className={target==="dummy"?"selected":""} onClick={()=>reset("dummy")}><Target size={19}/><b>Манекен</b><small>Проверка атак и урона</small></button><button className={target==="orc"?"selected":""} onClick={()=>reset("orc")}><Swords size={19}/><b>Агрессивный орк</b><small>Бой и получение урона</small></button></div>
        <button className="training-reset" onClick={()=>reset()}><RotateCcw size={15}/> Сбросить тренировку</button>
      </section>
      <section className="training-panel training-combat">
        <div className="training-panel-title"><h2>Тренировочная площадка</h2><span>РАУНД {round}</span></div>
        <div className={`training-opponent ${target}`}><div className="opponent-emblem">{target==="dummy"?"◎":"⚔"}</div><div><strong>{target==="dummy"?"Тренировочный манекен":"Агрессивный орк"}</strong><span>{target==="dummy"?"Неподвижная цель · не атакует": "Враждебная цель · КД 13 · 30 хитов"}</span></div><div className="opponent-hp"><b>{target==="dummy"?"∞":targetHp}</b><small>{target==="dummy"?"прочность":"хитов"}</small></div></div>
        <div className="training-vitals"><div><div><Heart size={16}/> <b>Хиты героя</b><strong>{heroHp} / {hpMax}</strong></div><div className="training-bar"><i style={{width:`${Math.max(0,heroHp/hpMax*100)}%`}}/></div></div><div><div><Shield size={16}/> <b>Временные хиты</b><strong>{tempHp}</strong></div><div className="training-bar temp"><i style={{width:`${Math.min(100,tempHp/Math.max(1,hpMax)*100)}%`}}/></div></div></div>
        <div className="training-actions"><h3>Действия героя</h3><div className="training-action-grid"><button onClick={()=>testAction("Обычная атака","Атака")}><Swords size={17}/> Обычная атака</button>{actions.slice(0,5).map((item,index)=><button key={item.name+index} onClick={()=>testAction(item.name,item.kind)}><Activity size={16}/>{item.name}</button>)}</div>{actions.length===0&&<p className="training-muted">Особенности, заклинания и атаки из листа героя появятся здесь, когда они будут заполнены.</p>}</div>
        {target==="orc"&&<div className="training-orc-controls"><button className="training-danger" onClick={orcAttack} disabled={targetHp<=0||heroHp<=0}><Swords size={16}/> Орк атакует героя</button><span>Атака орка: +5 к попаданию, урон 1к8+3</span></div>}
      </section>
      <section className="training-panel training-tools">
        <div className="training-panel-title"><h2>Проверки и тесты</h2><Dice5 size={18}/></div>
        <label className="training-field">Характеристика<select value={ability} onChange={event=>setAbility(event.target.value)}>{abilityList.map(item=><option key={item.id} value={item.id}>{item.name} ({mod(Number(hero.abilityScores[item.id]??10))>=0?"+":""}{mod(Number(hero.abilityScores[item.id]??10))})</option>)}</select></label>
        <label className="training-field">Сложность проверки (СЛ)<input type="number" min="1" max="40" value={customDc} onChange={event=>setCustomDc(event.target.value)}/></label>
        <button className="training-primary" onClick={rollAbility}>Бросить проверку</button>
        <div className="training-separator"/>
        <label className="training-field">Временные хиты для теста<input type="number" min="0" max="500" value={customBonus} onChange={event=>setCustomBonus(event.target.value)}/></label>
        <button className="training-secondary" onClick={useTempHp}>Применить временные хиты</button>
        {lastDamage>0&&<p className="training-muted">Последний входящий урон: {lastDamage}</p>}
      </section>
    </div>
    <section className="training-panel training-log"><div className="training-panel-title"><h2>Журнал тренировки</h2><span>{log.length} записей</span></div><ol>{log.map((line,index)=><li key={index}>{line}</li>)}</ol></section>
    <p className="training-footnote"><Shield size={14}/> Тренировочные хиты, временные хиты и результаты бросков изолированы от настоящего листа персонажа.</p>
  </section>;
}
