export const RULESET_VERSION = '5e-2014';

export const ABILITY_OPTIONS = [
  { id: 'str', name: 'Сила' },
  { id: 'dex', name: 'Ловкость' },
  { id: 'con', name: 'Телосложение' },
  { id: 'int', name: 'Интеллект' },
  { id: 'wis', name: 'Мудрость' },
  { id: 'cha', name: 'Харизма' },
] as const;

export const ALIGNMENTS = [
  { id: 'lawful-good', name: 'Законно-доброе' },
  { id: 'neutral-good', name: 'Нейтрально-доброе' },
  { id: 'chaotic-good', name: 'Хаотично-доброе' },
  { id: 'lawful-neutral', name: 'Законно-нейтральное' },
  { id: 'true-neutral', name: 'Нейтральное' },
  { id: 'chaotic-neutral', name: 'Хаотично-нейтральное' },
  { id: 'lawful-evil', name: 'Законно-злое' },
  { id: 'neutral-evil', name: 'Нейтрально-злое' },
  { id: 'chaotic-evil', name: 'Хаотично-злое' },
  { id: 'unaligned', name: 'Без мировоззрения' },
] as const;

export const CLASSES = [
  { id: 'barbarian', name: 'Варвар', hitDie: 12, savingThrows: ['str', 'con'], skillChoices: 2, skillOptions: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
  { id: 'bard', name: 'Бард', hitDie: 8, savingThrows: ['dex', 'cha'], skillChoices: 3, skillOptions: 'any' },
  { id: 'cleric', name: 'Жрец', hitDie: 8, savingThrows: ['wis', 'cha'], skillChoices: 2, skillOptions: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
  { id: 'druid', name: 'Друид', hitDie: 8, savingThrows: ['int', 'wis'], skillChoices: 2, skillOptions: ['arcana', 'animalHandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] },
  { id: 'fighter', name: 'Воин', hitDie: 10, savingThrows: ['str', 'con'], skillChoices: 2, skillOptions: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'] },
  { id: 'monk', name: 'Монах', hitDie: 8, savingThrows: ['str', 'dex'], skillChoices: 2, skillOptions: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
  { id: 'paladin', name: 'Паладин', hitDie: 10, savingThrows: ['wis', 'cha'], skillChoices: 2, skillOptions: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
  { id: 'ranger', name: 'Следопыт', hitDie: 10, savingThrows: ['str', 'dex'], skillChoices: 3, skillOptions: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'] },
  { id: 'rogue', name: 'Плут', hitDie: 8, savingThrows: ['dex', 'int'], skillChoices: 4, skillOptions: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleightOfHand', 'stealth'] },
  { id: 'sorcerer', name: 'Чародей', hitDie: 6, savingThrows: ['con', 'cha'], skillChoices: 2, skillOptions: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
  { id: 'warlock', name: 'Колдун', hitDie: 8, savingThrows: ['wis', 'cha'], skillChoices: 2, skillOptions: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] },
  { id: 'wizard', name: 'Волшебник', hitDie: 6, savingThrows: ['int', 'wis'], skillChoices: 2, skillOptions: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'] },
] as const;

export const SPECIES = [
  { id: 'dragonborn', name: 'Драконорождённый', baseSpeed: 30, size: 'Medium', abilityBonuses: { str: 2, cha: 1 }, languages: ['common', 'draconic'] },
  { id: 'dwarf', name: 'Дварф', baseSpeed: 25, size: 'Medium', abilityBonuses: { con: 2 }, languages: ['common', 'dwarvish'], subraces: [{ id: 'hill', name: 'Холмовой', abilityBonuses: { wis: 1 } }, { id: 'mountain', name: 'Горный', abilityBonuses: { str: 2 } }] },
  { id: 'elf', name: 'Эльф', baseSpeed: 30, size: 'Medium', abilityBonuses: { dex: 2 }, languages: ['common', 'elvish'], subraces: [{ id: 'high', name: 'Высший', abilityBonuses: { int: 1 } }, { id: 'wood', name: 'Лесной', abilityBonuses: { wis: 1 } }, { id: 'drow', name: 'Тёмный', abilityBonuses: { cha: 1 } }] },
  { id: 'gnome', name: 'Гном', baseSpeed: 25, size: 'Small', abilityBonuses: { int: 2 }, languages: ['common', 'gnomish'], subraces: [{ id: 'forest', name: 'Лесной', abilityBonuses: { dex: 1 } }, { id: 'rock', name: 'Скальный', abilityBonuses: { con: 1 } }] },
  { id: 'half-elf', name: 'Полуэльф', baseSpeed: 30, size: 'Medium', abilityBonuses: { cha: 2 }, flexibleAbilityBonuses: { count: 2, amount: 1, exclude: ['cha'] }, languages: ['common', 'elvish', 'choice'] },
  { id: 'half-orc', name: 'Полуорк', baseSpeed: 30, size: 'Medium', abilityBonuses: { str: 2, con: 1 }, languages: ['common', 'orc'] },
  { id: 'halfling', name: 'Полурослик', baseSpeed: 25, size: 'Small', abilityBonuses: { dex: 2 }, languages: ['common', 'halfling'], subraces: [{ id: 'lightfoot', name: 'Легконогий', abilityBonuses: { cha: 1 } }, { id: 'stout', name: 'Коренастый', abilityBonuses: { con: 1 } }] },
  { id: 'human', name: 'Человек', baseSpeed: 30, size: 'Medium', abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, variant: { id: 'variant', flexibleAbilityBonuses: { count: 2, amount: 1 }, extraSkill: 1, feat: 1 }, languages: ['common', 'choice'] },
  { id: 'tiefling', name: 'Тифлинг', baseSpeed: 30, size: 'Medium', abilityBonuses: { cha: 2, int: 1 }, languages: ['common', 'infernal'] },
] as const;

export const BACKGROUNDS = [
  { id: 'acolyte', name: 'Прислужник' },
  { id: 'charlatan', name: 'Шарлатан' },
  { id: 'criminal', name: 'Преступник' },
  { id: 'entertainer', name: 'Артист' },
  { id: 'folk-hero', name: 'Народный герой' },
  { id: 'guild-artisan', name: 'Гильдейский ремесленник' },
  { id: 'hermit', name: 'Отшельник' },
  { id: 'noble', name: 'Благородный' },
  { id: 'outlander', name: 'Чужеземец' },
  { id: 'sage', name: 'Мудрец' },
  { id: 'sailor', name: 'Моряк' },
  { id: 'soldier', name: 'Солдат' },
  { id: 'urchin', name: 'Беспризорник' },
] as const;

export const SKILLS = [
  { id: 'acrobatics', name: 'Акробатика', ability: 'dex' },
  { id: 'animalHandling', name: 'Уход за животными', ability: 'wis' },
  { id: 'arcana', name: 'Магия', ability: 'int' },
  { id: 'athletics', name: 'Атлетика', ability: 'str' },
  { id: 'deception', name: 'Обман', ability: 'cha' },
  { id: 'history', name: 'История', ability: 'int' },
  { id: 'insight', name: 'Проницательность', ability: 'wis' },
  { id: 'intimidation', name: 'Запугивание', ability: 'cha' },
  { id: 'investigation', name: 'Расследование', ability: 'int' },
  { id: 'medicine', name: 'Медицина', ability: 'wis' },
  { id: 'nature', name: 'Природа', ability: 'int' },
  { id: 'perception', name: 'Восприятие', ability: 'wis' },
  { id: 'performance', name: 'Выступление', ability: 'cha' },
  { id: 'persuasion', name: 'Убеждение', ability: 'cha' },
  { id: 'religion', name: 'Религия', ability: 'int' },
  { id: 'sleightOfHand', name: 'Ловкость рук', ability: 'dex' },
  { id: 'stealth', name: 'Скрытность', ability: 'dex' },
  { id: 'survival', name: 'Выживание', ability: 'wis' },
] as const;

export const EQUIPMENT_CATEGORIES = [
  { id: 'weapons', name: 'Оружие' },
  { id: 'armor', name: 'Доспехи' },
  { id: 'adventuring-gear', name: 'Снаряжение' },
  { id: 'tools', name: 'Инструменты' },
  { id: 'mounts', name: 'Транспорт и ездовые животные' },
  { id: 'trade-goods', name: 'Товары' },
] as const;

export const SPELL_LEVELS = Array.from({ length: 10 }, (_, level) => ({
  level,
  name: level === 0 ? 'Заговоры' : `Уровень ${level}`,
}));
