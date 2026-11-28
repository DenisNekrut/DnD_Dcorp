import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Shield, Swords, Heart, RotateCcw, Dice5, Activity, Target } from "lucide-react";

type TrainingCharacter = {
  id: string | number; name: string; className: string; level: number;
  abilityScores: Record<string, number>;
  skillProficiencies: string[];
  rawData?: Record<string, unknown>;
  derived: { maxHp: number; armorClass: number; speed: number };
};
type Props = { characters: TrainingCharacter[] };
type TargetMode = "dummy" | "orc" | "skeleton" | "troll";
type DamageType="acid"|"bludgeoning"|"cold"|"fire"|"force"|"lightning"|"necrotic"|"piercing"|"poison"|"psychic"|"radiant"|"slashing"|"thunder";
type DefenseMode="none"|"resistance"|"immunity"|"vulnerability";
const damageTypes:{id:DamageType;name:string}[]=[
{id:"acid",name:"Кислота"},{id:"bludgeoning",name:"Дробящий"},{id:"cold",name:"Холод"},{id:"fire",name:"Огонь"},{id:"force",name:"Силовой"},{id:"lightning",name:"Электричество"},{id:"necrotic",name:"Некротический"},{id:"piercing",name:"Колющий"},{id:"poison",name:"Яд"},{id:"psychic",name:"Психический"},{id:"radiant",name:"Излучение"},{id:"slashing",name:"Рубящий"},{id:"thunder",name:"Громовой"}
];
const defenseNames:Record<DefenseMode,string>={none:"Нет",resistance:"Сопротивление",immunity:"Иммунитет",vulnerability:"Уязвимость"};
const targetPresets:Record<TargetMode,{name:string;description:string;hp:number;ac:number;attackBonus:number;damage:string;aggressive:boolean;symbol:string;abilities:Record<string,number>}> = {
  dummy:{name:"Тренировочный манекен",description:"Неподвижная цель · не атакует",hp:9999,ac:10,attackBonus:0,damage:"1к4",aggressive:false,symbol:"◎",abilities:{str:10,dex:10,con:10,int:10,wis:10,cha:10}},
  orc:{name:"Агрессивный орк",description:"Враждебная цель · ближний бой",hp:30,ac:13,attackBonus:5,damage:"1к8+3",aggressive:true,symbol:"⚔",abilities:{str:16,dex:12,con:16,int:7,wis:11,cha:10}},
  skeleton:{name:"Скелет-воин",description:"Нежить · проверка контроля",hp:18,ac:13,attackBonus:4,damage:"1к6+2",aggressive:true,symbol:"☠",abilities:{str:10,dex:14,con:15,int:6,wis:8,cha:5}},
  troll:{name:"Тролль",description:"Крупный противник · много хитов",hp:84,ac:15,attackBonus:7,damage:"2к6+4",aggressive:true,symbol:"♜",abilities:{str:18,dex:13,con:20,int:7,wis:9,cha:7}}
};
const abilityList = [{id:"str",name:"Сила"},{id:"dex",name:"Ловкость"},{id:"con",name:"Телосложение"},{id:"int",name:"Интеллект"},{id:"wis",name:"Мудрость"},{id:"cha",name:"Харизма"}];
const mod = (score:number) => Math.floor(((Number.isFinite(score) ? score : 10) - 10) / 2);
const d = (sides:number) => Math.floor(Math.random()*sides)+1;
const rollDamageFormula = (formula:string, fallbackModifier=0):number|null => {
  const normalized=formula.trim().toLowerCase().replace(/к/g,"d").replace(/\s+/g,"");
  const match=normalized.match(/^(\d{1,2})d(4|6|8|10|12|20)([+-]\d{1,3})?$/);
  if(!match) return null;
  const count=Number(match[1]), sides=Number(match[2]), modifier=match[3]?Number(match[3]):fallbackModifier;
  if(count<1||count>10||modifier < -100||modifier>100) return null;
  let total=modifier;
  for(let i=0;i<count;i++) total+=d(sides);
  return Math.max(0,total);
};
const GRID_COLS=9, GRID_ROWS=7, CELL_METERS=1.5;
const BLOCKED_CELLS=["3,1","3,2","3,3","5,4","6,4","7,4"];
type GridPoint={x:number;y:number};
type ExtraOpponent={id:number;type:Exclude<TargetMode,"dummy">;hp:number;position:GridPoint};
const gridKey=(point:GridPoint)=>`${point.x},${point.y}`;
const readNames = (value:unknown):string[] => Array.isArray(value) ? value.map(item => typeof item === "string" ? item : item && typeof item === "object" ? String((item as Record<string,unknown>).name ?? (item as Record<string,unknown>).title ?? "") : "").filter(Boolean) : [];

export default function TrainingArena({characters}:Props) {
  const [heroId,setHeroId] = useState<string>(characters[0] ? String(characters[0].id) : "");
  const hero = characters.find(item=>String(item.id)===heroId) ?? characters[0];
  useEffect(()=>{
    if(!hero) return;
    setHeroId(String(hero.id));
    setHeroHp(Math.max(1,hero.derived.maxHp));
    setTempHp(0);
    setTargetHp(targetPresets[target].hp);
    setRound(1);
    setLastDamage(0);
    setLog(["Выбран герой: "+hero.name+". Показатели тренировочной сцены сброшены."]);
  },[hero?.id]);
  const [target,setTarget] = useState<TargetMode>("dummy");
  const [targetHp,setTargetHp] = useState(30);
  const [targetArmorClass,setTargetArmorClass] = useState(10);
  const [targetAttackBonus,setTargetAttackBonus] = useState(5);
  const [targetDamageFormula,setTargetDamageFormula] = useState("1к8+3");
  const [customDamageFormula,setCustomDamageFormula] = useState("");
  const [heroHp,setHeroHp] = useState(hero?.derived.maxHp ?? 1);
  const [tempHp,setTempHp] = useState(0);
  const [log,setLog] = useState<string[]>(["Тренировка готова. Все изменения существуют только в этой тренировочной сцене."]);
  const [ability,setAbility] = useState("str");
  const [customName,setCustomName] = useState("");
  const [customBonus,setCustomBonus] = useState("0");
  const [customDc,setCustomDc] = useState("12");
  const [round,setRound] = useState(1);
  const [lastDamage,setLastDamage] = useState(0);
  const [heroPosition,setHeroPosition]=useState<GridPoint>({x:1,y:3});
  const [targetPosition,setTargetPosition]=useState<GridPoint>({x:7,y:3});
  const [placingTarget,setPlacingTarget]=useState(false);
  const [obstacles,setObstacles]=useState<string[]>(BLOCKED_CELLS);
  const [coverCells,setCoverCells]=useState<string[]>([]);
  const [terrainMode,setTerrainMode]=useState<"move"|"obstacle"|"cover">("move");
  const [extraOpponents,setExtraOpponents]=useState<ExtraOpponent[]>([]);
  const [newOpponentType,setNewOpponentType]=useState<Exclude<TargetMode,"dummy">>("orc");
  const [areaShape,setAreaShape]=useState<"radius"|"square"|"line"|"cone">("radius");
  const [areaSize,setAreaSize]=useState("6");
  const [attackRange,setAttackRange]=useState("9");
  const [showArea,setShowArea]=useState(true);
  const [areaSaveDc,setAreaSaveDc]=useState("12");
  const [areaSaveAbility,setAreaSaveAbility]=useState("dex");
  const [damageType,setDamageType]=useState<DamageType>("fire");
  const [defenseTargetType,setDefenseTargetType]=useState<Exclude<TargetMode,"dummy">>("orc");
  const [damageDefenses,setDamageDefenses]=useState<Record<Exclude<TargetMode,"dummy">,Partial<Record<DamageType,DefenseMode>>>>({
    orc:{},skeleton:{bludgeoning:"vulnerability",poison:"immunity"},troll:{}
  });

  const data = hero?.rawData ?? {};
  const actions = useMemo(()=>[
    ...readNames(data.features).map(name=>({name,kind:"Особенность"})),
    ...readNames(data.spells).map(name=>({name,kind:"Заклинание"})),
    ...readNames(data.attacks).map(name=>({name,kind:"Атака"})),
  ].filter((item,index,all)=>all.findIndex(other=>other.name===item.name)===index),[hero]);
  const hpMax = Math.max(1,hero?.derived.maxHp ?? 1);
  const armorClass = hero?.derived.armorClass ?? 10;
  const reset = (nextTarget:TargetMode=target) => {
    const preset=targetPresets[nextTarget];
    setTarget(nextTarget); setTargetHp(preset.hp); setTargetArmorClass(preset.ac);
    setTargetAttackBonus(preset.attackBonus); setTargetDamageFormula(preset.damage);
    setHeroHp(hpMax); setTempHp(0); setRound(1); setLastDamage(0);
    setHeroPosition({x:1,y:3}); setTargetPosition({x:7,y:3}); setPlacingTarget(false); setExtraOpponents([]);
    setLog([preset.aggressive?"Начата тренировка против противника: "+preset.name+".":"Новая тренировка: манекен не атакует."]);
  };
  const addLog = (line:string) => setLog(current=>[line,...current].slice(0,12));
  const rollAbility = () => {
    if(!hero) return;
    const score=Number(hero.abilityScores[ability]??10), bonus=mod(score), die=d(20), total=die+bonus, dc=Math.max(1,Number(customDc)||12);
    addLog(`${abilityList.find(item=>item.id===ability)?.name}: d20 (${die}) ${bonus>=0?"+":""}${bonus} = ${total} против СЛ ${dc} — ${total>=dc?"успех":"неудача"}.`);
  };
  const testAction = (name:string,kind:string) => {
    if(!hero || heroHp<=0 || (targetPresets[target].aggressive && targetHp<=0)) return;
    const proficiency=Math.floor((Math.max(1,Math.min(20,hero.level))-1)/4)+2;
    if(kind==="Особенность") {
      addLog("Особенность активирована для проверки: «"+name+"». Тренировочная сцена не расходует ресурсы листа персонажа.");
      return;
    }
    const spellAbilityByClass:Record<string,string>={"Бард":"cha","Жрец":"wis","Друид":"wis","Паладин":"cha","Следопыт":"wis","Чародей":"cha","Колдун":"cha","Волшебник":"int"};
    const attackAbility=kind==="Заклинание"?(spellAbilityByClass[hero.className]??"int"):"str";
    const abilityModifier=mod(Number(hero.abilityScores[attackAbility]??10));
    const die=d(20), bonus=abilityModifier+proficiency;
    const primaryDistance=distanceInMeters(heroPosition,targetPosition);
    const nearestExtra=[...extraOpponents].filter(enemy=>enemy.hp>0).sort((a,b)=>distanceInMeters(heroPosition,a.position)-distanceInMeters(heroPosition,b.position))[0];
    const useExtra=!!nearestExtra&&nearestExtra.hp>0&&distanceInMeters(heroPosition,nearestExtra.position)<primaryDistance;
    const targetName=useExtra?targetPresets[nearestExtra!.type].name:targetPresets[target].name;
    const targetAc=useExtra?targetPresets[nearestExtra!.type].ac+(coverCells.includes(gridKey(nearestExtra!.position))?2:0):Math.max(1,Math.min(40,Number(targetArmorClass)||10))+(coverCells.includes(gridKey(targetPosition))?2:0);
    const applyDamage=(amount:number)=>{
      if(useExtra&&nearestExtra){setExtraOpponents(current=>current.map(enemy=>enemy.id===nearestExtra.id?{...enemy,hp:Math.max(0,enemy.hp-amount)}:enemy));}
      else if(targetPresets[target].aggressive){setTargetHp(current=>Math.max(0,current-amount));}
    };
    const hit=die===20 || (die!==1 && die+bonus>=targetAc);
    if(kind==="Заклинание") {
      const damage=hit && customDamageFormula.trim()?rollDamageFormula(customDamageFormula):null;
      if(damage!==null) applyDamage(damage);
      addLog("Проверка заклинательной атаки «"+name+"»: d20 "+die+" "+(bonus>=0?"+":"")+bonus+" = "+(die+bonus)+" против КД "+targetAc+" ("+targetName+") — "+(hit?"попадание":"промах")+(damage!==null?", тестовый урон "+damage:". Урон не применён: укажи формулу конкретного заклинания в настройке тестового урона")+".");
      return;
    }
    const formula=customDamageFormula.trim()||"1d8";
    const damage=hit?(rollDamageFormula(formula,abilityModifier)??0):0;
    if(hit) applyDamage(damage);
    addLog("Атака «"+name+"»: d20 "+die+" "+(bonus>=0?"+":"")+bonus+" = "+(die+bonus)+" против КД "+targetAc+" ("+targetName+") — "+(hit?"попадание, урон "+damage+" ("+formula+")":"промах")+".");
  };
  const opponentAttack = () => {
    const preset=targetPresets[target];
    if(!preset.aggressive || targetHp<=0 || heroHp<=0) return;
    const die=d(20), total=die+targetAttackBonus;
    const effectiveArmorClass=armorClass+(coverCells.includes(gridKey(heroPosition))?2:0);
    const hit=die===20 || (die!==1 && total>=effectiveArmorClass);
    const damage=hit?(rollDamageFormula(targetDamageFormula)??0):0;
    const absorbed=Math.min(tempHp,damage), remaining=damage-absorbed;
    setTempHp(value=>value-absorbed); setHeroHp(value=>Math.max(0,value-remaining)); setLastDamage(damage);
    setRound(value=>value+1);
    addLog(`${preset.name} атакует: d20 ${die} ${targetAttackBonus>=0?"+":""}${targetAttackBonus} = ${total} против КД ${effectiveArmorClass} — ${hit?`попадание, ${damage} урона (временные хиты поглотили ${absorbed})`:"промах"}.`);
  };
  const distanceInMeters=(a:GridPoint,b:GridPoint)=>(Math.abs(a.x-b.x)+Math.abs(a.y-b.y))*CELL_METERS;
  const areaRadiusCells=Math.max(1,Math.min(12,Math.ceil((Number(areaSize)||0)/CELL_METERS)));
  const isInSpellArea=(point:GridPoint)=>{
    if(!showArea)return false;
    const dx=point.x-heroPosition.x,dy=point.y-heroPosition.y;
    const tx=targetPosition.x-heroPosition.x,ty=targetPosition.y-heroPosition.y;
    const length=Math.hypot(tx,ty)||1,forward=(dx*tx+dy*ty)/length,lateral=Math.abs(dx*ty-dy*tx)/length;
    if(areaShape==="radius")return Math.hypot(dx,dy)<=areaRadiusCells;
    if(areaShape==="square")return Math.max(Math.abs(dx),Math.abs(dy))<=areaRadiusCells;
    if(areaShape==="line")return forward>=0&&forward<=areaRadiusCells&&lateral<=0.55;
    return forward>=0&&forward<=areaRadiusCells&&lateral<=forward*0.58+0.5;
  };
  const getTargetSaveBonus=(type:TargetMode,ability:string)=>mod(targetPresets[type].abilities[ability]??10);
  const attackDistance=distanceInMeters(heroPosition,targetPosition);
  const attackRangeMeters=Math.max(0,Number(attackRange)||0);
  const applyAreaEffect=()=>{
    if(!customDamageFormula.trim()){addLog("Укажи формулу тестового урона перед применением эффекта по зоне.");return;}
    const dc=Math.max(1,Math.min(30,Number(areaSaveDc)||12));
    const defenseFor=(type:Exclude<TargetMode,"dummy">):DefenseMode=>damageDefenses[type]?.[damageType]??"none";
    const applyDefenses=(damage:number,defense:DefenseMode)=>{
      if(defense==="immunity")return 0;
      if(defense==="resistance")return Math.floor(damage/2);
      if(defense==="vulnerability")return damage*2;
      return damage;
    };
    const primaryAffected=targetPresets[target].aggressive&&targetHp>0&&isInSpellArea(targetPosition);
    const extraAffected=extraOpponents.filter(enemy=>enemy.hp>0&&isInSpellArea(enemy.position));
    if(!primaryAffected&&!extraAffected.length){addLog("В выбранной зоне нет живых противников. Манекен не получает урон.");return;}
    const affected=[...(primaryAffected?[{id:"primary",name:targetPresets[target].name}]:[]),...extraAffected.map(enemy=>({id:String(enemy.id),name:targetPresets[enemy.type].name}))];
    const rolled=rollDamageFormula(customDamageFormula);
    if(rolled===null){addLog("Некорректная формула урона. Используй, например, 2к6+3.");return;}
    const updates=affected.map(enemy=>{
      const enemyType:Exclude<TargetMode,"dummy">=enemy.id==="primary"?(target==="dummy"?"orc":target):(extraOpponents.find(item=>String(item.id)===enemy.id)?.type??"orc");
      const saveBonus=getTargetSaveBonus(enemyType,areaSaveAbility);
      const saveRoll=d(20),total=saveRoll+saveBonus,success=total>=dc;
      const afterSave=success?Math.floor(rolled/2):rolled;
      const defense=defenseFor(enemyType);
      return {...enemy,saveBonus,saveRoll,total,success,defense,damage:applyDefenses(afterSave,defense)};
    });
    const primary=updates.find(item=>item.id==="primary");
    if(primary)setTargetHp(value=>Math.max(0,value-primary.damage));
    const extraDamage=new Map(updates.filter(item=>item.id!=="primary").map(item=>[Number(item.id),item.damage]));
    if(extraDamage.size)setExtraOpponents(current=>current.map(enemy=>extraDamage.has(enemy.id)?{...enemy,hp:Math.max(0,enemy.hp-(extraDamage.get(enemy.id)??0))}:enemy));
    addLog("Зона ("+areaShape+", "+areaSize+" м), тип урона: "+(damageTypes.find(item=>item.id===damageType)?.name??damageType)+", спасбросок "+(abilityList.find(item=>item.id===areaSaveAbility)?.name??areaSaveAbility)+", Сл "+dc+": "+updates.map(item=>item.name+" — d20 "+item.saveRoll+" + "+item.saveBonus+" = "+item.total+(item.success?" (успех)":" (провал)")+", "+defenseNames[item.defense]+"; "+item.damage+" урона").join("; ")+". Сначала применена половина урона за успешный спасбросок, затем защита от выбранного типа урона.");
  };
  const moveHeroTo=(destination:GridPoint)=>{
    if(obstacles.includes(gridKey(destination)) || gridKey(destination)===gridKey(targetPosition) || extraOpponents.some(enemy=>gridKey(enemy.position)===gridKey(destination))) return;
    const queue:[GridPoint,number][]=[[heroPosition,0]], visited=new Set([gridKey(heroPosition)]);
    let pathLength:number|null=null;
    while(queue.length){
      const [point,steps]=queue.shift()!;
      if(gridKey(point)===gridKey(destination)){pathLength=steps;break;}
      for(const next of [{x:point.x+1,y:point.y},{x:point.x-1,y:point.y},{x:point.x,y:point.y+1},{x:point.x,y:point.y-1}]){
        const key=gridKey(next);
        if(next.x<0||next.x>=GRID_COLS||next.y<0||next.y>=GRID_ROWS||visited.has(key)||obstacles.includes(key)||key===gridKey(targetPosition)||extraOpponents.some(enemy=>gridKey(enemy.position)===key)) continue;
        visited.add(key);queue.push([next,steps+1]);
      }
    }
    const maxCells=Math.floor((Number(hero.derived.speed||0)*0.3)/CELL_METERS);
    if(pathLength===null){addLog("Путь перекрыт препятствиями или занят целью.");return;}
    if(pathLength===0)return;
    if(pathLength>maxCells){addLog(`Недостаточно скорости: путь ${(pathLength*CELL_METERS).toFixed(1)} м, доступно ${(maxCells*CELL_METERS).toFixed(1)} м за ход.`);return;}
    setHeroPosition(destination);setRound(value=>value+1);
    addLog(`Герой переместился на ${(pathLength*CELL_METERS).toFixed(1)} м. Остаток скорости: ${Math.max(0,Number(hero.derived.speed||0)*0.3-pathLength*CELL_METERS).toFixed(1)} м.`);
  };
  const handleGridCell=(point:GridPoint)=>{
    const key=gridKey(point),occupied=key===gridKey(heroPosition)||key===gridKey(targetPosition)||extraOpponents.some(enemy=>gridKey(enemy.position)===key);
    if(terrainMode==="obstacle"||terrainMode==="cover"){
      if(occupied){addLog("Нельзя менять тип клетки, занятой героем или целью.");return;}
      if(terrainMode==="obstacle"){
        setObstacles(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key]);
        setCoverCells(current=>current.filter(item=>item!==key));
        addLog("Препятствие переключено.");
      }else{
        setCoverCells(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key]);
        setObstacles(current=>current.filter(item=>item!==key));
        addLog("Укрытие переключено. Оно даёт +2 к КД находящейся на нём цели.");
      }
      return;
    }
    if(placingTarget){
      if(obstacles.includes(key)||occupied){addLog("Нельзя разместить противника на препятствии или занятой клетке.");return;}
      setTargetPosition(point);setPlacingTarget(false);addLog(`Позиция цели изменена: клетка ${point.x+1}, ${point.y+1}.`);return;
    }
    moveHeroTo(point);
  };
  const addOpponent=()=>{
    if(extraOpponents.length>=3){addLog("В этой версии можно добавить не более трёх дополнительных противников.");return;}
    const occupied=new Set([gridKey(heroPosition),gridKey(targetPosition),...extraOpponents.map(enemy=>gridKey(enemy.position)),...obstacles]);
    let position:GridPoint|undefined;
    for(let y=0;y<GRID_ROWS&&!position;y++)for(let x=0;x<GRID_COLS&&!position;x++)if(!occupied.has(`${x},${y}`))position={x,y};
    if(!position){addLog("На поле нет свободной клетки для нового противника.");return;}
    const preset=targetPresets[newOpponentType];
    setExtraOpponents(current=>[...current,{id:Date.now(),type:newOpponentType,hp:preset.hp,position:position!}]);
    addLog(`На поле добавлен противник: ${preset.name}.`);
  };
  const attackWithExtraOpponent=(enemy:ExtraOpponent)=>{
    if(enemy.hp<=0||heroHp<=0)return;
    const preset=targetPresets[enemy.type],die=d(20),total=die+preset.attackBonus;
    const ac=armorClass+(coverCells.includes(gridKey(heroPosition))?2:0);
    const hit=die===20||(die!==1&&total>=ac),damage=hit?(rollDamageFormula(preset.damage)??0):0;
    const absorbed=Math.min(tempHp,damage),remaining=damage-absorbed;
    setTempHp(value=>value-absorbed);setHeroHp(value=>Math.max(0,value-remaining));setLastDamage(damage);setRound(value=>value+1);
    addLog(`${preset.name} атакует: d20 ${die} + ${preset.attackBonus} = ${total} против КД ${ac} — ${hit?`попадание, ${damage} урона (временные хиты поглотили ${absorbed})`:"промах"}.`);
  };
  const opponentTurn = () => {
    if(heroHp<=0) return;
    type ActingEnemy={id:string;name:string;position:GridPoint;hp:number;attackBonus:number;damage:string;primary:boolean;extraId?:number};
    const actors:ActingEnemy[]=[
      ...(targetPresets[target].aggressive&&targetHp>0?[{id:"primary",name:targetPresets[target].name,position:targetPosition,hp:targetHp,attackBonus:targetAttackBonus,damage:targetDamageFormula,primary:true}]:[]),
      ...extraOpponents.filter(enemy=>enemy.hp>0).map(enemy=>({id:String(enemy.id),name:targetPresets[enemy.type].name,position:enemy.position,hp:enemy.hp,attackBonus:targetPresets[enemy.type].attackBonus,damage:targetPresets[enemy.type].damage,primary:false,extraId:enemy.id}))
    ];
    if(!actors.length){addLog("На поле нет активных противников.");return;}
    let currentHeroHp=heroHp,currentTempHp=tempHp;
    let nextTargetPosition=targetPosition;
    let nextTargetHp=targetHp;
    let nextExtras=extraOpponents.map(enemy=>({...enemy}));
    const events:string[]=[];
    const neighbors=(point:GridPoint):GridPoint[]=>[{x:point.x+1,y:point.y},{x:point.x-1,y:point.y},{x:point.x,y:point.y+1},{x:point.x,y:point.y-1}].filter(p=>p.x>=0&&p.x<GRID_COLS&&p.y>=0&&p.y<GRID_ROWS);
    for(const actor of actors){
      if(currentHeroHp<=0) break;
      const livePosition=actor.primary?nextTargetPosition:nextExtras.find(enemy=>enemy.id===actor.extraId)?.position??actor.position;
      const occupied=new Set<string>([
        gridKey(heroPosition),
        ...obstacles,
        ...(actor.primary?nextExtras.filter(enemy=>enemy.hp>0).map(enemy=>gridKey(enemy.position)):[gridKey(nextTargetPosition),...nextExtras.filter(enemy=>enemy.id!==actor.extraId&&enemy.hp>0).map(enemy=>gridKey(enemy.position))])
      ]);
      const queue:{point:GridPoint;path:GridPoint[]}[]=[{point:livePosition,path:[]}];
      const visited=new Set([gridKey(livePosition)]);
      let path:GridPoint[]|null=null;
      while(queue.length){
        const current=queue.shift()!;
        if(distanceInMeters(current.point,heroPosition)<=CELL_METERS&&current.path.length>0){path=current.path;break;}
        if(distanceInMeters(current.point,heroPosition)<=CELL_METERS&&current.path.length===0){path=[];break;}
        for(const next of neighbors(current.point)){
          const key=gridKey(next);
          if(visited.has(key)||occupied.has(key))continue;
          visited.add(key);queue.push({point:next,path:[...current.path,next]});
        }
      }
      let position=livePosition;
      if(path&&path.length>0){
        position=path[Math.min(5,path.length)-1];
        if(actor.primary)nextTargetPosition=position;
        else nextExtras=nextExtras.map(enemy=>enemy.id===actor.extraId?{...enemy,position}:enemy);
        events.push(actor.name+" перемещается к герою.");
      }else if(!path){
        events.push(actor.name+" не может найти свободный путь к герою.");
      }
      if(distanceInMeters(position,heroPosition)<=CELL_METERS){
        const die=d(20),total=die+actor.attackBonus,ac=armorClass+(coverCells.includes(gridKey(heroPosition))?2:0);
        const hit=die===20||(die!==1&&total>=ac),damage=hit?(rollDamageFormula(actor.damage)??0):0;
        const absorbed=Math.min(currentTempHp,damage),remaining=damage-absorbed;
        currentTempHp-=absorbed;currentHeroHp=Math.max(0,currentHeroHp-remaining);
        events.push(actor.name+" атакует: d20 "+die+" + "+actor.attackBonus+" = "+total+" против КД "+ac+" — "+(hit?"попадание, "+damage+" урона; временные хиты поглотили "+absorbed:"промах")+".");
      }
    }
    setTargetPosition(nextTargetPosition);setTargetHp(nextTargetHp);setExtraOpponents(nextExtras);
    setHeroHp(currentHeroHp);setTempHp(currentTempHp);setLastDamage(Math.max(0,heroHp-currentHeroHp));
    setRound(value=>value+1);
    setLog(current=>[...events,"Ход противников завершён.",...current].slice(0,12));
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
        <div className="training-targets">{(Object.keys(targetPresets) as TargetMode[]).map(key=><button key={key} className={target===key?"selected":""} onClick={()=>reset(key)}><b>{targetPresets[key].symbol} {targetPresets[key].name}</b><small>{key==="dummy"?"Проверка атак и урона":key==="skeleton"?"Нежить и контроль":key==="troll"?"Выносливость и высокий запас хитов":"Бой и получение урона"}</small></button>)}</div>
        <button className="training-reset" onClick={()=>reset()}><RotateCcw size={15}/> Сбросить тренировку</button>
      </section>
      <section className="training-panel training-combat">
        <div className="training-panel-title"><h2>Тренировочная площадка</h2><span>РАУНД {round}</span></div>
        <div className={`training-opponent ${target}`}><div className="opponent-emblem">{targetPresets[target].symbol}</div><div><strong>{targetPresets[target].name}</strong><span>{targetPresets[target].description}</span></div><div className="opponent-hp"><b>{!targetPresets[target].aggressive && target==="dummy"?"∞":targetHp}</b><small>{target==="dummy"?"прочность":"хитов"}</small></div></div>
        <div className="training-opponent-settings">
          <label className="training-field">Хиты противника<input type="number" min="1" max="9999" value={targetHp} onChange={event=>setTargetHp(Math.max(1,Math.min(9999,Number(event.target.value)||1)))}/></label>
          <label className="training-field training-target-ac">Класс защиты цели (КД)<input type="number" min="1" max="40" value={targetArmorClass} onChange={event=>setTargetArmorClass(Math.max(1,Math.min(40,Number(event.target.value)||1)))}/></label>
        </div>
        <div className="training-vitals"><div><div><Heart size={16}/> <b>Хиты героя</b><strong>{heroHp} / {hpMax}</strong></div><div className="training-bar"><i style={{width:`${Math.max(0,heroHp/hpMax*100)}%`}}/></div></div><div><div><Shield size={16}/> <b>Временные хиты</b><strong>{tempHp}</strong></div><div className="training-bar temp"><i style={{width:`${Math.min(100,tempHp/Math.max(1,hpMax)*100)}%`}}/></div></div></div>
        <div className="training-actions"><h3>Действия героя</h3><div className="training-action-grid"><button onClick={()=>testAction("Обычная атака","Атака")}><Swords size={17}/> Обычная атака</button>{actions.slice(0,5).map((item,index)=><button key={item.name+index} onClick={()=>testAction(item.name,item.kind)}><Activity size={16}/>{item.name}</button>)}</div>{actions.length===0&&<p className="training-muted">Особенности отмечаются как активированные; заклинания проходят проверку атаки без выдуманной формулы урона. Обычные атаки используют тестовый профиль 1к8.</p>}</div>
        {targetPresets[target].aggressive&&<div className="training-orc-controls">
          <div className="training-opponent-settings">
            <label className="training-field">Бонус атаки<input type="number" min="-5" max="20" value={targetAttackBonus} onChange={event=>setTargetAttackBonus(Math.max(-5,Math.min(20,Number(event.target.value)||0)))}/></label>
            <label className="training-field">Урон противника<input type="text" value={targetDamageFormula} onChange={event=>setTargetDamageFormula(event.target.value)} placeholder="1к8+3"/></label>
          </div>
          <button className="training-danger" onClick={opponentAttack} disabled={targetHp<=0||heroHp<=0}><Swords size={16}/> {targetPresets[target].name} атакует героя</button>
        </div>}
      </section>
      <section className="training-panel training-tactical">
        <div className="training-panel-title"><h2>Тактическое поле</h2><span>КЛЕТКА 1,5 М</span></div>
        <div className="training-map-legend"><span><i className="legend-hero"/> Герой</span><span><i className="legend-target"/> Цель</span><span><i className="legend-block"/> Препятствие</span><span><i className="legend-cover"/> Укрытие (+2 КД)</span></div>
        <div className="training-map-actions terrain-tools">
          <button className={terrainMode==="move"?"selected":""} onClick={()=>{setTerrainMode("move");setPlacingTarget(false);}}>Перемещение</button>
          <button className={terrainMode==="obstacle"?"selected":""} onClick={()=>{setTerrainMode("obstacle");setPlacingTarget(false);}}>Рисовать препятствия</button>
          <button className={terrainMode==="cover"?"selected":""} onClick={()=>{setTerrainMode("cover");setPlacingTarget(false);}}>Расставить укрытия</button>
        </div>
        <div className="training-grid" role="grid" aria-label="Тактическое поле 9 на 7 клеток">
          {Array.from({length:GRID_ROWS},(_,y)=>Array.from({length:GRID_COLS},(_,x)=>{
            const point={x,y},key=gridKey(point),isHero=key===gridKey(heroPosition),isTarget=key===gridKey(targetPosition),extra=extraOpponents.find(enemy=>gridKey(enemy.position)===key),blocked=obstacles.includes(key),cover=coverCells.includes(key);
            return <button type="button" role="gridcell" aria-label={`Клетка ${x+1}, ${y+1}${isHero?", герой":""}${isTarget?", цель":""}${extra?", "+targetPresets[extra.type].name:""}${blocked?", препятствие":""}${cover?", укрытие":""}`} key={key} className={`training-cell${isHero?" hero-cell":""}${isTarget?" target-cell":""}${extra?" extra-target-cell":""}${blocked?" blocked-cell":""}${cover?" cover-cell":""}${isInSpellArea(point)?" spell-area-cell":""}`} disabled={(blocked&&terrainMode==="move")||(isHero&&!placingTarget&&terrainMode==="move")} onClick={()=>handleGridCell(point)}>{isHero?"Г":isTarget?targetPresets[target].symbol:extra?targetPresets[extra.type].symbol:blocked?"▦":cover?"▧":isInSpellArea(point)?"·":""}</button>;
          }))}
        </div>
        <div className="training-extra-opponents">
          <div className="training-panel-title"><h3>Дополнительные противники</h3><span>{extraOpponents.length}/3</span></div>
          <div className="training-map-actions">
            <select aria-label="Тип дополнительного противника" value={newOpponentType} onChange={event=>setNewOpponentType(event.target.value as Exclude<TargetMode,"dummy">)}><option value="orc">Орк</option><option value="skeleton">Скелет-воин</option><option value="troll">Тролль</option></select>
            <button onClick={addOpponent} disabled={extraOpponents.length>=3}>Добавить противника</button>
          </div>
          <button className="training-danger" onClick={opponentTurn} disabled={heroHp<=0||(!targetPresets[target].aggressive||targetHp<=0)&&extraOpponents.every(enemy=>enemy.hp<=0)}>Ход противников: движение и атака</button>\n          {extraOpponents.length===0?<p className="training-muted">Дополнительных противников пока нет.</p>:extraOpponents.map(enemy=><div className="training-extra-row" key={enemy.id}>
            <span><b>{targetPresets[enemy.type].symbol} {targetPresets[enemy.type].name}</b><small>Клетка {enemy.position.x+1}, {enemy.position.y+1} · {enemy.hp} хитов</small></span>
            <button onClick={()=>attackWithExtraOpponent(enemy)} disabled={enemy.hp<=0||heroHp<=0}>Атаковать</button>
            <button onClick={()=>setExtraOpponents(current=>current.filter(item=>item.id!==enemy.id))}>Убрать</button>
          </div>)}
        </div>
        <div className="training-area-tools">
          <div className="training-panel-title"><h3>Дальность атак и зоны заклинаний</h3><span>ПРЕДПРОСМОТР</span></div>
          <div className="training-area-fields">
            <label>Дальность атаки, м<input type="number" min="0" max="100" step="1" value={attackRange} onChange={event=>setAttackRange(event.target.value)}/></label>
            <label>Форма зоны<select value={areaShape} onChange={event=>setAreaShape(event.target.value as typeof areaShape)}><option value="radius">Радиус</option><option value="square">Квадрат</option><option value="line">Линия</option><option value="cone">Конус</option></select></label>
            <label>Размер зоны, м<input type="number" min="1.5" max="18" step="1.5" value={areaSize} onChange={event=>setAreaSize(event.target.value)}/></label>
          </div>
          <div className="training-area-fields">
            <label>Сложность спасброска<input type="number" min="1" max="30" value={areaSaveDc} onChange={event=>setAreaSaveDc(event.target.value)}/></label>
            <label>Характеристика спасброска<select value={areaSaveAbility} onChange={event=>setAreaSaveAbility(event.target.value)}>{abilityList.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Бонусы целей<input value="Рассчитываются автоматически" readOnly/></label>
          </div>
          <div className="training-area-fields">
            <label>Тип тестового урона<select value={damageType} onChange={event=>setDamageType(event.target.value as DamageType)}>{damageTypes.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Настроить защиту существа<select value={defenseTargetType} onChange={event=>setDefenseTargetType(event.target.value as Exclude<TargetMode,"dummy">)}><option value="orc">Орк</option><option value="skeleton">Скелет-воин</option><option value="troll">Тролль</option></select></label>
            <label>Защита от типа урона<select value={damageDefenses[defenseTargetType]?.[damageType]??"none"} onChange={event=>setDamageDefenses(current=>({...current,[defenseTargetType]:{...current[defenseTargetType],[damageType]:event.target.value as DefenseMode}}))}>{Object.entries(defenseNames).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>
          </div>
          <p className="training-muted">Защита настраивается отдельно для каждого шаблона существа и типа урона. Скелет по умолчанию уязвим к дробящему урону и имеет иммунитет к яду.</p>
          <div className="training-map-actions">
            <button className={showArea?"selected":""} onClick={()=>setShowArea(value=>!value)}>{showArea?"Скрыть зону":"Показать зону"}</button>
          </div>
          <button className="training-danger" onClick={applyAreaEffect} disabled={!showArea||heroHp<=0}>Применить тестовый эффект по зоне</button>
          <p className="training-muted">Расстояние до основной цели: {attackDistance.toFixed(1)} м. {attackDistance<=attackRangeMeters?"Цель в пределах заданной дальности.":"Цель за пределами заданной дальности."} Подсветка показывает геометрический предварительный просмотр от героя в направлении цели; она не применяет урон и не заменяет проверку правил конкретного заклинания.</p>
        </div>
        <div className="training-map-controls">
          <div><b>Герой:</b> клетка {heroPosition.x+1}, {heroPosition.y+1}</div>
          <div><b>Цель:</b> клетка {targetPosition.x+1}, {targetPosition.y+1}</div>
          <div><b>Расстояние:</b> {distanceInMeters(heroPosition,targetPosition).toFixed(1)} м</div>
          <div><b>Скорость за ход:</b> {(Number(hero.derived.speed||0)*0.3).toFixed(1)} м</div>
        </div>
        <div className="training-map-actions">
          <button className={placingTarget?"selected":""} onClick={()=>setPlacingTarget(value=>!value)}>{placingTarget?"Отмена размещения":"Переместить цель"}</button>
          <button onClick={()=>{setHeroPosition({x:1,y:3});setTargetPosition({x:7,y:3});setPlacingTarget(false);setTerrainMode("move");setObstacles(BLOCKED_CELLS);setCoverCells([]);setExtraOpponents([]);addLog("Поле и позиции сброшены.");}}>Сбросить поле</button>
        </div>
        <p className="training-muted">В режиме перемещения нажми свободную клетку. В режимах редактирования нажимай клетки, чтобы добавлять или убирать препятствия и укрытия. Укрытие даёт +2 к КД находящегося на нём участника.</p>
      </section>
      <section className="training-panel training-tools">
        <div className="training-panel-title"><h2>Проверки и тесты</h2><Dice5 size={18}/></div>
        <label className="training-field">Характеристика<select value={ability} onChange={event=>setAbility(event.target.value)}>{abilityList.map(item=><option key={item.id} value={item.id}>{item.name} ({mod(Number(hero.abilityScores[item.id]??10))>=0?"+":""}{mod(Number(hero.abilityScores[item.id]??10))})</option>)}</select></label>
        <label className="training-field">Сложность проверки (СЛ)<input type="number" min="1" max="40" value={customDc} onChange={event=>setCustomDc(event.target.value)}/></label>
        <button className="training-primary" onClick={rollAbility}>Бросить проверку</button>
        <div className="training-separator"/>
        <label className="training-field">Формула тестового урона (например, 2к6+3)<input type="text" value={customDamageFormula} onChange={event=>setCustomDamageFormula(event.target.value)} placeholder="Пусто — без урона заклинанием"/></label>
        <p className="training-muted">Для обычной атаки без формулы используется тестовый профиль 1к8 + модификатор Силы. Для заклинания урон применяется только после ввода формулы.</p>
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
