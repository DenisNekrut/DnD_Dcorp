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
  { id: 'barbarian', name: 'Варвар', hitDie: 12, savingThrows: ['str', 'con'], skillChoices: 2 },
  { id: 'bard', name: 'Бард', hitDie: 8, savingThrows: ['dex', 'cha'], skillChoices: 3 },
  { id: 'cleric', name: 'Жрец', hitDie: 8, savingThrows: ['wis', 'cha'], skillChoices: 2 },
  { id: 'druid', name: 'Друид', hitDie: 8, savingThrows: ['int', 'wis'], skillChoices: 2 },
  { id: 'fighter', name: 'Воин', hitDie: 10, savingThrows: ['str', 'con'], skillChoices: 2 },
  { id: 'monk', name: 'Монах', hitDie: 8, savingThrows: ['str', 'dex'], skillChoices: 2 },
  { id: 'paladin', name: 'Паладин', hitDie: 10, savingThrows: ['wis', 'cha'], skillChoices: 2 },
  { id: 'ranger', name: 'Следопыт', hitDie: 10, savingThrows: ['str', 'dex'], skillChoices: 3 },
  { id: 'rogue', name: 'Плут', hitDie: 8, savingThrows: ['dex', 'int'], skillChoices: 4 },
  { id: 'sorcerer', name: 'Чародей', hitDie: 6, savingThrows: ['con', 'cha'], skillChoices: 2 },
  { id: 'warlock', name: 'Колдун', hitDie: 8, savingThrows: ['wis', 'cha'], skillChoices: 2 },
  { id: 'wizard', name: 'Волшебник', hitDie: 6, savingThrows: ['int', 'wis'], skillChoices: 2 },
] as const;

export const SPECIES = [
  { id: 'dragonborn', name: 'Драконорождённый', baseSpeed: 30, size: 'Medium', languages: ['common', 'draconic'] },
  { id: 'dwarf', name: 'Дварф', baseSpeed: 25, size: 'Medium', languages: ['common', 'dwarvish'] },
  { id: 'elf', name: 'Эльф', baseSpeed: 30, size: 'Medium', languages: ['common', 'elvish'] },
  { id: 'gnome', name: 'Гном', baseSpeed: 25, size: 'Small', languages: ['common', 'gnomish'] },
  { id: 'half-elf', name: 'Полуэльф', baseSpeed: 30, size: 'Medium', languages: ['common', 'elvish', 'choice'] },
  { id: 'half-orc', name: 'Полуорк', baseSpeed: 30, size: 'Medium', languages: ['common', 'orc'] },
  { id: 'halfling', name: 'Полурослик', baseSpeed: 25, size: 'Small', languages: ['common', 'halfling'] },
  { id: 'human', name: 'Человек', baseSpeed: 30, size: 'Medium', languages: ['common', 'choice'] },
  { id: 'tiefling', name: 'Тифлинг', baseSpeed: 30, size: 'Medium', languages: ['common', 'infernal'] },
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
