import { z } from 'zod';
import { ReferenceDataSchema, SectionSchema, type ReferenceData } from './schema';
import odds from './odds.json';
import houseRules from './house-rules.json';
import skills from './skills.json';
import sections from './sections.json';
import examples from './examples.json';
import mythicTables from './mythic-tables.json';
import names from './names.json';
import items from './items.json';
import services from './services.json';
import { MythicTablesSchema, withMythicTables } from './mythic';
import { NamesSchema, withNames } from './names';

export * from './schema';

/** Die Referenzdaten, beim Start gegen die Schemas geprüft. Ein Fehler hier bricht den Start ab. */
export const referenceData: ReferenceData = ReferenceDataSchema.parse({
  odds,
  houseRules,
  skills,
  sections: withNames(withMythicTables(z.array(SectionSchema).parse(sections), MythicTablesSchema.parse(mythicTables)), NamesSchema.parse(names)),
  examples,
  items,
  ...services,
});
