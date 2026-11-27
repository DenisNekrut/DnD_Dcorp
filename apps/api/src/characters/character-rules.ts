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

export function normalizeCharacterData(input: Record<string, unknown>) {
  const level = input.level === undefined ? 1 : Number(input.level);
  const bonus = proficiencyBonus(level);

  const rawScores = (input.abilityScores ?? {}) as Record<string, unknown>;
  if (typeof rawScores !== 'object' || rawScores === null || Array.isArray(rawScores)) {
    throw new BadRequestException('abilityScores must be an object');
  }

  const abilityScores = Object.fromEntries(
    ABILITIES.map((ability) => {
      const score = rawScores[ability] === undefined ? 10 : Number(rawScores[ability]);
      if (!Number.isInteger(score) || score < 1 || score > 20) {
        throw new BadRequestException(`abilityScores.${ability} must be an integer from 1 to 20`);
      }
      return [ability, score];
    }),
  ) as Record<Ability, number>;

  const skillProficiencies = stringArray(input.skillProficiencies, 'skillProficiencies');
  const savingThrowProficiencies = stringArray(input.savingThrowProficiencies, 'savingThrowProficiencies');
  for (const ability of savingThrowProficiencies) {
    if (!ABILITIES.includes(ability as Ability)) {
      throw new BadRequestException(`Unknown saving throw ability: ${ability}`);
    }
  }
  for (const skill of skillProficiencies) {
    if (!(skill in SKILL_ABILITIES)) throw new BadRequestException(`Unknown skill: ${skill}`);
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
      abilityModifiers[ability] + (skillProficiencies.includes(skill) ? bonus : 0),
    ]),
  );
  const passivePerception = 10 + skillModifiers.perception;

  return {
    ...input,
    level,
    experiencePoints: Number.isInteger(input.experiencePoints) && Number(input.experiencePoints) >= 0
      ? Number(input.experiencePoints) : 0,
    abilityScores,
    abilityModifiers,
    proficiencyBonus: bonus,
    skillProficiencies,
    savingThrowProficiencies,
    savingThrowModifiers,
    skillModifiers,
    passivePerception,
    hitPoints: {
      maximum: 1,
      current: 1,
      temporary: 0,
      ...((input.hitPoints && typeof input.hitPoints === 'object' && !Array.isArray(input.hitPoints))
        ? input.hitPoints as Record<string, unknown> : {}),
    },
    deathSaves: {
      successes: 0,
      failures: 0,
      ...((input.deathSaves && typeof input.deathSaves === 'object' && !Array.isArray(input.deathSaves))
        ? input.deathSaves as Record<string, unknown> : {}),
    },
    equipment: stringArray(input.equipment, 'equipment'),
    features: stringArray(input.features, 'features'),
    languages: stringArray(input.languages, 'languages'),
    conditions: stringArray(input.conditions, 'conditions'),
    spells: stringArray(input.spells, 'spells'),
  };
}
