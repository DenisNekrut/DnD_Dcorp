export type WeaponRecord = {
  id: string;
  name: string;
  category: 'simple' | 'martial';
  kind: 'melee' | 'ranged';
  damage: string | null;
  damageType: 'bludgeoning' | 'piercing' | 'slashing' | null;
  cost: { amount: number; currency: 'cp' | 'sp' | 'gp' };
  weightLb: number;
  properties: string[];
  rangeFt?: { normal: number; long: number };
  versatileDamage?: string;
};

export const WEAPONS: WeaponRecord[] = [
  { id: 'quarterstaff', name: 'Боевой посох', category: 'simple', kind: 'melee', damage: '1d6', damageType: 'bludgeoning', cost: { amount: 2, currency: 'sp' }, weightLb: 4, properties: ['versatile'], versatileDamage: '1d8' },
  { id: 'mace', name: 'Булава', category: 'simple', kind: 'melee', damage: '1d6', damageType: 'bludgeoning', cost: { amount: 5, currency: 'gp' }, weightLb: 4, properties: [] },
  { id: 'club', name: 'Дубинка', category: 'simple', kind: 'melee', damage: '1d4', damageType: 'bludgeoning', cost: { amount: 1, currency: 'sp' }, weightLb: 2, properties: ['light'] },
  { id: 'dagger', name: 'Кинжал', category: 'simple', kind: 'melee', damage: '1d4', damageType: 'piercing', cost: { amount: 2, currency: 'gp' }, weightLb: 1, properties: ['finesse', 'light', 'thrown'], rangeFt: { normal: 20, long: 60 } },
  { id: 'spear', name: 'Копьё', category: 'simple', kind: 'melee', damage: '1d6', damageType: 'piercing', cost: { amount: 1, currency: 'gp' }, weightLb: 3, properties: ['thrown', 'versatile'], rangeFt: { normal: 20, long: 60 }, versatileDamage: '1d8' },
  { id: 'light-hammer', name: 'Лёгкий молот', category: 'simple', kind: 'melee', damage: '1d4', damageType: 'bludgeoning', cost: { amount: 2, currency: 'gp' }, weightLb: 2, properties: ['light', 'thrown'], rangeFt: { normal: 20, long: 60 } },
  { id: 'javelin', name: 'Метательное копьё', category: 'simple', kind: 'melee', damage: '1d6', damageType: 'piercing', cost: { amount: 5, currency: 'sp' }, weightLb: 2, properties: ['thrown'], rangeFt: { normal: 30, long: 120 } },
  { id: 'greatclub', name: 'Палица', category: 'simple', kind: 'melee', damage: '1d8', damageType: 'bludgeoning', cost: { amount: 2, currency: 'sp' }, weightLb: 10, properties: ['two-handed'] },
  { id: 'handaxe', name: 'Ручной топор', category: 'simple', kind: 'melee', damage: '1d6', damageType: 'slashing', cost: { amount: 5, currency: 'gp' }, weightLb: 2, properties: ['light', 'thrown'], rangeFt: { normal: 20, long: 60 } },
  { id: 'sickle', name: 'Серп', category: 'simple', kind: 'melee', damage: '1d4', damageType: 'slashing', cost: { amount: 1, currency: 'gp' }, weightLb: 2, properties: ['light'] },
  { id: 'light-crossbow', name: 'Арбалет, лёгкий', category: 'simple', kind: 'ranged', damage: '1d8', damageType: 'piercing', cost: { amount: 25, currency: 'gp' }, weightLb: 5, properties: ['ammunition', 'two-handed', 'loading'], rangeFt: { normal: 80, long: 320 } },
  { id: 'dart', name: 'Дротик', category: 'simple', kind: 'ranged', damage: '1d4', damageType: 'piercing', cost: { amount: 5, currency: 'cp' }, weightLb: 0.25, properties: ['finesse', 'thrown'], rangeFt: { normal: 20, long: 60 } },
  { id: 'shortbow', name: 'Короткий лук', category: 'simple', kind: 'ranged', damage: '1d6', damageType: 'piercing', cost: { amount: 25, currency: 'gp' }, weightLb: 2, properties: ['ammunition', 'two-handed'], rangeFt: { normal: 80, long: 320 } },
  { id: 'sling', name: 'Праща', category: 'simple', kind: 'ranged', damage: '1d4', damageType: 'bludgeoning', cost: { amount: 1, currency: 'sp' }, weightLb: 0, properties: ['ammunition'], rangeFt: { normal: 30, long: 120 } },
  { id: 'halberd', name: 'Алебарда', category: 'martial', kind: 'melee', damage: '1d10', damageType: 'slashing', cost: { amount: 20, currency: 'gp' }, weightLb: 6, properties: ['heavy', 'reach', 'two-handed'] },
  { id: 'war-pick', name: 'Боевая кирка', category: 'martial', kind: 'melee', damage: '1d8', damageType: 'piercing', cost: { amount: 5, currency: 'gp' }, weightLb: 2, properties: [] },
  { id: 'warhammer', name: 'Боевой молот', category: 'martial', kind: 'melee', damage: '1d8', damageType: 'bludgeoning', cost: { amount: 15, currency: 'gp' }, weightLb: 2, properties: ['versatile'], versatileDamage: '1d10' },
  { id: 'battleaxe', name: 'Боевой топор', category: 'martial', kind: 'melee', damage: '1d8', damageType: 'slashing', cost: { amount: 10, currency: 'gp' }, weightLb: 4, properties: ['versatile'], versatileDamage: '1d10' },
  { id: 'glaive', name: 'Глефа', category: 'martial', kind: 'melee', damage: '1d10', damageType: 'slashing', cost: { amount: 20, currency: 'gp' }, weightLb: 6, properties: ['heavy', 'reach', 'two-handed'] },
  { id: 'greatsword', name: 'Двуручный меч', category: 'martial', kind: 'melee', damage: '2d6', damageType: 'slashing', cost: { amount: 50, currency: 'gp' }, weightLb: 6, properties: ['heavy', 'two-handed'] },
  { id: 'lance', name: 'Длинное копьё', category: 'martial', kind: 'melee', damage: '1d12', damageType: 'piercing', cost: { amount: 10, currency: 'gp' }, weightLb: 6, properties: ['reach', 'special'] },
  { id: 'longsword', name: 'Длинный меч', category: 'martial', kind: 'melee', damage: '1d8', damageType: 'slashing', cost: { amount: 15, currency: 'gp' }, weightLb: 3, properties: ['versatile'], versatileDamage: '1d10' },
  { id: 'whip', name: 'Кнут', category: 'martial', kind: 'melee', damage: '1d4', damageType: 'slashing', cost: { amount: 2, currency: 'gp' }, weightLb: 3, properties: ['finesse', 'reach'] },
  { id: 'shortsword', name: 'Короткий меч', category: 'martial', kind: 'melee', damage: '1d6', damageType: 'piercing', cost: { amount: 10, currency: 'gp' }, weightLb: 2, properties: ['finesse', 'light'] },
  { id: 'maul', name: 'Молот', category: 'martial', kind: 'melee', damage: '2d6', damageType: 'bludgeoning', cost: { amount: 10, currency: 'gp' }, weightLb: 10, properties: ['heavy', 'two-handed'] },
  { id: 'morningstar', name: 'Моргенштерн', category: 'martial', kind: 'melee', damage: '1d8', damageType: 'piercing', cost: { amount: 15, currency: 'gp' }, weightLb: 4, properties: [] },
  { id: 'pike', name: 'Пика', category: 'martial', kind: 'melee', damage: '1d10', damageType: 'piercing', cost: { amount: 5, currency: 'gp' }, weightLb: 18, properties: ['heavy', 'reach', 'two-handed'] },
  { id: 'rapier', name: 'Рапира', category: 'martial', kind: 'melee', damage: '1d8', damageType: 'piercing', cost: { amount: 25, currency: 'gp' }, weightLb: 2, properties: ['finesse'] },
  { id: 'greataxe', name: 'Секира', category: 'martial', kind: 'melee', damage: '1d12', damageType: 'slashing', cost: { amount: 30, currency: 'gp' }, weightLb: 7, properties: ['heavy', 'two-handed'] },
  { id: 'scimitar', name: 'Скимитар', category: 'martial', kind: 'melee', damage: '1d6', damageType: 'slashing', cost: { amount: 25, currency: 'gp' }, weightLb: 3, properties: ['finesse', 'light'] },
  { id: 'trident', name: 'Трезубец', category: 'martial', kind: 'melee', damage: '1d6', damageType: 'piercing', cost: { amount: 5, currency: 'gp' }, weightLb: 4, properties: ['thrown', 'versatile'], rangeFt: { normal: 20, long: 60 }, versatileDamage: '1d8' },
  { id: 'flail', name: 'Цеп', category: 'martial', kind: 'melee', damage: '1d8', damageType: 'bludgeoning', cost: { amount: 10, currency: 'gp' }, weightLb: 2, properties: [] },
  { id: 'hand-crossbow', name: 'Арбалет, ручной', category: 'martial', kind: 'ranged', damage: '1d6', damageType: 'piercing', cost: { amount: 75, currency: 'gp' }, weightLb: 3, properties: ['ammunition', 'light', 'loading'], rangeFt: { normal: 30, long: 120 } },
  { id: 'heavy-crossbow', name: 'Арбалет, тяжёлый', category: 'martial', kind: 'ranged', damage: '1d10', damageType: 'piercing', cost: { amount: 50, currency: 'gp' }, weightLb: 18, properties: ['ammunition', 'heavy', 'two-handed', 'loading'], rangeFt: { normal: 100, long: 400 } },
  { id: 'longbow', name: 'Длинный лук', category: 'martial', kind: 'ranged', damage: '1d8', damageType: 'piercing', cost: { amount: 50, currency: 'gp' }, weightLb: 2, properties: ['ammunition', 'heavy', 'two-handed'], rangeFt: { normal: 150, long: 600 } },
  { id: 'blowgun', name: 'Духовая трубка', category: 'martial', kind: 'ranged', damage: '1', damageType: 'piercing', cost: { amount: 10, currency: 'gp' }, weightLb: 1, properties: ['ammunition', 'loading'], rangeFt: { normal: 25, long: 100 } },
  { id: 'net', name: 'Сеть', category: 'martial', kind: 'ranged', damage: null, damageType: null, cost: { amount: 1, currency: 'gp' }, weightLb: 3, properties: ['special', 'thrown'], rangeFt: { normal: 5, long: 15 } },
];

export const ARMOR = [
  { id: 'padded', name: 'Стёганный доспех', category: 'light', cost: { amount: 5, currency: 'gp' }, armorClass: { base: 11, dexterity: 'full' }, strengthRequirement: null, stealthDisadvantage: true, weightLb: 8, donMinutes: 1, doffMinutes: 1 },
  { id: 'leather', name: 'Кожаный доспех', category: 'light', cost: { amount: 10, currency: 'gp' }, armorClass: { base: 11, dexterity: 'full' }, strengthRequirement: null, stealthDisadvantage: false, weightLb: 10, donMinutes: 1, doffMinutes: 1 },
  { id: 'studded-leather', name: 'Проклёпанная кожа', category: 'light', cost: { amount: 45, currency: 'gp' }, armorClass: { base: 12, dexterity: 'full' }, strengthRequirement: null, stealthDisadvantage: false, weightLb: 13, donMinutes: 1, doffMinutes: 1 },
  { id: 'hide', name: 'Шкурный доспех', category: 'medium', cost: { amount: 10, currency: 'gp' }, armorClass: { base: 12, dexterity: 2 }, strengthRequirement: null, stealthDisadvantage: false, weightLb: 12, donMinutes: 5, doffMinutes: 1 },
  { id: 'chain-shirt', name: 'Кольчужная рубаха', category: 'medium', cost: { amount: 50, currency: 'gp' }, armorClass: { base: 13, dexterity: 2 }, strengthRequirement: null, stealthDisadvantage: false, weightLb: 20, donMinutes: 5, doffMinutes: 1 },
  { id: 'scale-mail', name: 'Чешуйчатый доспех', category: 'medium', cost: { amount: 50, currency: 'gp' }, armorClass: { base: 14, dexterity: 2 }, strengthRequirement: null, stealthDisadvantage: true, weightLb: 45, donMinutes: 5, doffMinutes: 1 },
  { id: 'breastplate', name: 'Кираса', category: 'medium', cost: { amount: 400, currency: 'gp' }, armorClass: { base: 14, dexterity: 2 }, strengthRequirement: null, stealthDisadvantage: false, weightLb: 20, donMinutes: 5, doffMinutes: 1 },
  { id: 'half-plate', name: 'Полулаты', category: 'medium', cost: { amount: 750, currency: 'gp' }, armorClass: { base: 15, dexterity: 2 }, strengthRequirement: null, stealthDisadvantage: true, weightLb: 40, donMinutes: 5, doffMinutes: 1 },
  { id: 'ring-mail', name: 'Колечный доспех', category: 'heavy', cost: { amount: 30, currency: 'gp' }, armorClass: { base: 14, dexterity: 0 }, strengthRequirement: null, stealthDisadvantage: true, weightLb: 40, donMinutes: 10, doffMinutes: 5 },
  { id: 'chain-mail', name: 'Кольчуга', category: 'heavy', cost: { amount: 75, currency: 'gp' }, armorClass: { base: 16, dexterity: 0 }, strengthRequirement: 13, stealthDisadvantage: true, weightLb: 55, donMinutes: 10, doffMinutes: 5 },
  { id: 'splint', name: 'Наборный доспех', category: 'heavy', cost: { amount: 200, currency: 'gp' }, armorClass: { base: 17, dexterity: 0 }, strengthRequirement: 15, stealthDisadvantage: true, weightLb: 60, donMinutes: 10, doffMinutes: 5 },
  { id: 'plate', name: 'Латы', category: 'heavy', cost: { amount: 1500, currency: 'gp' }, armorClass: { base: 18, dexterity: 0 }, strengthRequirement: 15, stealthDisadvantage: true, weightLb: 65, donMinutes: 10, doffMinutes: 5 },
  { id: 'shield', name: 'Щит', category: 'shield', cost: { amount: 10, currency: 'gp' }, armorClass: { bonus: 2 }, strengthRequirement: null, stealthDisadvantage: false, weightLb: 6, donMinutes: 0, doffMinutes: 0 },
] as const;

export const ADVENTURING_GEAR = [
  { id: 'backpack', name: 'Рюкзак', cost: { amount: 2, currency: 'gp' }, weightLb: 5, category: 'container' },
  { id: 'bedroll', name: 'Спальный мешок', cost: { amount: 1, currency: 'gp' }, weightLb: 7, category: 'camping' },
  { id: 'rope-hempen-50', name: 'Пеньковая верёвка (50 футов)', cost: { amount: 1, currency: 'gp' }, weightLb: 10, category: 'utility' },
  { id: 'rope-silk-50', name: 'Шёлковая верёвка (50 футов)', cost: { amount: 10, currency: 'gp' }, weightLb: 5, category: 'utility' },
  { id: 'torch', name: 'Факел', cost: { amount: 1, currency: 'cp' }, weightLb: 1, category: 'light' },
  { id: 'waterskin', name: 'Бурдюк', cost: { amount: 2, currency: 'sp' }, weightLb: 5, category: 'container' },
  { id: 'rations-day', name: 'Рацион (1 день)', cost: { amount: 5, currency: 'sp' }, weightLb: 2, category: 'food' },
  { id: 'tinderbox', name: 'Трутница', cost: { amount: 5, currency: 'sp' }, weightLb: 1, category: 'utility' },
  { id: 'lantern-hooded', name: 'Закрытый фонарь', cost: { amount: 5, currency: 'gp' }, weightLb: 2, category: 'light' },
  { id: 'oil-flask', name: 'Фляга масла', cost: { amount: 1, currency: 'sp' }, weightLb: 1, category: 'utility' },
  { id: 'crowbar', name: 'Ломик', cost: { amount: 2, currency: 'gp' }, weightLb: 5, category: 'tool' },
  { id: 'hammer', name: 'Молоток', cost: { amount: 1, currency: 'gp' }, weightLb: 3, category: 'tool' },
  { id: 'piton', name: 'Шлямбур', cost: { amount: 5, currency: 'cp' }, weightLb: 0.25, category: 'utility' },
  { id: 'healers-kit', name: 'Набор целителя', cost: { amount: 5, currency: 'gp' }, weightLb: 3, category: 'medical' },
  { id: 'manacles', name: 'Кандалы', cost: { amount: 2, currency: 'gp' }, weightLb: 6, category: 'restraint' },
  { id: 'mirror-steel', name: 'Стальное зеркало', cost: { amount: 5, currency: 'gp' }, weightLb: 0.5, category: 'utility' },
  { id: 'spellbook', name: 'Книга заклинаний', cost: { amount: 50, currency: 'gp' }, weightLb: 3, category: 'arcane' },
] as const;

export const TOOLS = [
  { id: 'thieves-tools', name: 'Воровские инструменты', cost: { amount: 25, currency: 'gp' }, weightLb: 1, category: 'specialist' },
  { id: 'navigators-tools', name: 'Инструменты навигатора', cost: { amount: 25, currency: 'gp' }, weightLb: 2, category: 'specialist' },
  { id: 'poisoners-kit', name: 'Инструменты отравителя', cost: { amount: 50, currency: 'gp' }, weightLb: 2, category: 'specialist' },
  { id: 'alchemists-supplies', name: 'Инструменты алхимика', cost: { amount: 50, currency: 'gp' }, weightLb: 8, category: 'artisan' },
  { id: 'brewers-supplies', name: 'Инструменты пивовара', cost: { amount: 20, currency: 'gp' }, weightLb: 9, category: 'artisan' },
  { id: 'calligraphers-supplies', name: 'Инструменты каллиграфа', cost: { amount: 10, currency: 'gp' }, weightLb: 5, category: 'artisan' },
  { id: 'carpenters-tools', name: 'Инструменты плотника', cost: { amount: 8, currency: 'gp' }, weightLb: 6, category: 'artisan' },
  { id: 'cobblers-tools', name: 'Инструменты сапожника', cost: { amount: 5, currency: 'gp' }, weightLb: 5, category: 'artisan' },
  { id: 'cooks-utensils', name: 'Инструменты повара', cost: { amount: 1, currency: 'gp' }, weightLb: 8, category: 'artisan' },
  { id: 'leatherworkers-tools', name: 'Инструменты кожевника', cost: { amount: 5, currency: 'gp' }, weightLb: 5, category: 'artisan' },
  { id: 'masons-tools', name: 'Инструменты каменщика', cost: { amount: 10, currency: 'gp' }, weightLb: 8, category: 'artisan' },
  { id: 'smiths-tools', name: 'Инструменты кузнеца', cost: { amount: 20, currency: 'gp' }, weightLb: 8, category: 'artisan' },
  { id: 'woodcarvers-tools', name: 'Инструменты резчика по дереву', cost: { amount: 1, currency: 'gp' }, weightLb: 5, category: 'artisan' },
] as const;
