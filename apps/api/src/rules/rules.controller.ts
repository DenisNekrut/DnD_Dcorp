import { Controller, Get } from '@nestjs/common';
import {
  ABILITY_OPTIONS,
  ALIGNMENTS,
  BACKGROUNDS,
  CLASSES,
  EQUIPMENT_CATEGORIES,
  RULESET_VERSION,
  SKILLS,
  SPECIES,
  SPELL_LEVELS,
} from './rules-data';
import { ADVENTURING_GEAR, ARMOR, TOOLS, WEAPONS } from './equipment-data';

@Controller('rules')
export class RulesController {
  @Get()
  getIndex() {
    return {
      ruleset: RULESET_VERSION,
      catalogs: [
        'abilities',
        'alignments',
        'classes',
        'species',
        'backgrounds',
        'skills',
        'equipment-categories',
        'spell-levels',
        'weapons',
        'armor',
        'adventuring-gear',
        'tools',
      ],
    };
  }

  @Get('abilities') abilities() { return ABILITY_OPTIONS; }
  @Get('alignments') alignments() { return ALIGNMENTS; }
  @Get('classes') classes() { return CLASSES; }
  @Get('species') species() { return SPECIES; }
  @Get('backgrounds') backgrounds() { return BACKGROUNDS; }
  @Get('skills') skills() { return SKILLS; }
  @Get('equipment-categories') equipmentCategories() { return EQUIPMENT_CATEGORIES; }
  @Get('spell-levels') spellLevels() { return SPELL_LEVELS; }
  @Get('weapons') weapons() { return WEAPONS; }
  @Get('armor') armor() { return ARMOR; }
  @Get('adventuring-gear') adventuringGear() { return ADVENTURING_GEAR; }
  @Get('tools') tools() { return TOOLS; }
}
