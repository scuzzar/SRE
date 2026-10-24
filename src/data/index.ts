import { z } from 'zod';
import { ReferenceDataSchema, SectionSchema, type ReferenceData } from './schema';
import odds from './odds.json';
import houseRules from './house-rules.json';
import skills from './skills.json';
import sections from './sections.json';
import examples from './examples.json';
import mythicTables from './mythic-tables.json';
import { MythicTablesSchema, withMythicTables } from './mythic';

export * from './schema';

/** Die Referenzdaten, beim Start gegen die Schemas geprüft. Ein Fehler hier bricht den Start ab. */
export const referenceData: ReferenceData = ReferenceDataSchema.parse({
  odds,
  houseRules,
  skills,
  sections: withMythicTables(z.array(SectionSchema).parse(sections), MythicTablesSchema.parse(mythicTables)),
  examples,
});
