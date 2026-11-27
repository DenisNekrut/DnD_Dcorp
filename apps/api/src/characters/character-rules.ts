import { BadRequestException } from '@nestjs/common';

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];

export const SKILL_ABILITIES: Record<string, Ability> = {
  acrobatics: 'dex',
  animalHandling: 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  sleightOfHand: 'dex',
  stealth: 'dex',
  survival: 'wis',
};

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 20) {
    throw new BadRequestException('Character level must be between 1 and 20');
  }
  return 2 + Math.floor((level - 1) / 4);
}

function stringArray(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new BadRequestException(`${field} must be an array of strings`);
  }
  return [...new Set(value as string[])];
}

function textField(input: Record<string, unknown>, field: string): string {
  const value = input[field];
  if (value === undefined) return '';
  if (typeof value !== 'string') throw new BadRequestException(`${field} must be a string`);
  return value;
}

function numberField(
  value: unknown,
  field: string,
  fallback: number,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new BadRequestException(`${field} must be an integer from ${minimum} to ${maximum}`);
  }
  return number;
}

function objectField(value: unknown, field: string): Record<string, unknown> {
  if (value === undefined) return {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function normalizeCharacterData(input: Record<string, unknown>) {
  const level = numberField(input.level, 'level', 1, 1, 20);
  const bonus = proficiencyBonus(level);
  const rawScores = objectField(input.abilityScores, 'abilityScores');

  const abilityScores = Object.fromEntries(
    ABILITIES.map((ability) => [
      ability,
      numberField(rawScores[ability], `abilityScores.${ability}`, 10, 1, 20),
    ]),
  ) as Record<Ability, number>;

  const skillProficiencies = stringArray(input.skillProficiencies, 'skillProficiencies');
  const skillExpertise = stringArray(input.skillExpertise, 'skillExpertise');
  const savingThrowProficiencies = stringArray(input.savingThrowProficiencies, 'savingThrowProficiencies');

  for (const ability of savingThrowProficiencies) {
    if (!ABILITIES.includes(ability as Ability)) {
      throw new BadRequestException(`Unknown saving throw ability: ${ability}`);
    }
  }
  for (const skill of [...skillProficiencies, ...skillExpertise]) {
    if (!(skill in SKILL_ABILITIES)) throw new BadRequestException(`Unknown skill: ${skill}`);
  }
  for (const skill of skillExpertise) {
    if (!skillProficiencies.includes(skill)) {
      throw new BadRequestException(`Expertise requires proficiency in ${skill}`);
    }
  }

  const abilityModifiers = Object.fromEntries(
    ABILITIES.map((ability) => [ability, abilityModifier(abilityScores[ability])]),
  ) as Record<Ability, number>;
  const savingThrowModifiers = Object.fromEntries(
    ABILITIES.map((ability) => [
      ability,
      abilityModifiers[ability] + (savingThrowProficiencies.includes(ability) ? bonus : 0),
    ]),
  ) as Record<Ability, number>;
  const skillModifiers = Object.fromEntries(
    Object.entries(SKILL_ABILITIES).map(([skill, ability]) => [
      skill,
      abilityModifiers[ability] +
        (skillExpertise.includes(skill) ? bonus * 2 : skillProficiencies.includes(skill) ? bonus : 0),
    ]),
  );
  const passivePerception = 10 + skillModifiers.perception;

  const rawHp = objectField(input.hitPoints, 'hitPoints');
  const hitPointMaximum = numberField(rawHp.maximum, 'hitPoints.maximum', 1, 1);
  const hitPoints = {
    maximum: hitPointMaximum,
    current: numberField(rawHp.current, 'hitPoints.current', hitPointMaximum, 0),
    temporary: numberField(rawHp.temporary, 'hitPoints.temporary', 0, 0),
  };
  if (hitPoints.current > hitPoints.maximum) {
    throw new BadRequestException('Current hit points cannot exceed maximum hit points');
  }

  const rawDeathSaves = objectField(input.deathSaves, 'deathSaves');
  const deathSaves = {
    successes: numberField(rawDeathSaves.successes, 'deathSaves.successes', 0, 0, 3),
    failures: numberField(rawDeathSaves.failures, 'deathSaves.failures', 0, 0, 3),
  };
  const rawCurrency = objectField(input.currency, 'currency');
  const currency = Object.fromEntries(
    ['cp', 'sp', 'ep', 'gp', 'pp'].map((coin) => [
      coin,
      numberField(rawCurrency[coin], `currency.${coin}`, 0, 0),
    ]),
  );

  const rawHitDice = objectField(input.hitDice, 'hitDice');
  const hitDice = {
    total: numberField(rawHitDice.total, 'hitDice.total', level, 1, 20),
    remaining: numberField(rawHitDice.remaining, 'hitDice.remaining', level, 0, 20),
    die: typeof rawHitDice.die === 'string' ? rawHitDice.die : 'd8',
  };
  if (hitDice.remaining > hitDice.total) {
    throw new BadRequestException('Remaining hit dice cannot exceed total hit dice');
  }

  const rawProficiencies = objectField(input.proficiencies, 'proficiencies');
  const proficiencies = {
    armor: stringArray(rawProficiencies.armor, 'proficiencies.armor'),
    weapons: stringArray(rawProficiencies.weapons, 'proficiencies.weapons'),
    tools: stringArray(rawProficiencies.tools, 'proficiencies.tools'),
  };

  if (input.inspiration !== undefined && typeof input.inspiration !== 'boolean') {
    throw new BadRequestException('inspiration must be a boolean');
  }

  return {
    ...input,
    species: textField(input, 'species'),
    characterClass: textField(input, 'characterClass'),
    subclass: textField(input, 'subclass'),
    background: textField(input, 'background'),
    alignment: textField(input, 'alignment'),
    level,
    experiencePoints: numberField(input.experiencePoints, 'experiencePoints', 0, 0),
    abilityScores,
    abilityModifiers,
    proficiencyBonus: bonus,
    skillProficiencies,
    skillExpertise,
    savingThrowProficiencies,
    savingThrowModifiers,
    skillModifiers,
    passivePerception,
    armorClass: numberField(input.armorClass, 'armorClass', 10, 0),
    initiative: abilityModifiers.dex,
    speed: numberField(input.speed, 'speed', 30, 0),
    hitPoints,
    hitDice,
    deathSaves,
    proficiencies,
    languages: stringArray(input.languages, 'languages'),
    equipment: stringArray(input.equipment, 'equipment'),
    features: stringArray(input.features, 'features'),
    conditions: stringArray(input.conditions, 'conditions'),
    spells: stringArray(input.spells, 'spells'),
    attacks: stringArray(input.attacks, 'attacks'),
    personalityTraits: textField(input, 'personalityTraits'),
    ideals: textField(input, 'ideals'),
    bonds: textField(input, 'bonds'),
    flaws: textField(input, 'flaws'),
    appearance: textField(input, 'appearance'),
    backstory: textField(input, 'backstory'),
    currency,
    inspiration: input.inspiration === true,
  };
}
