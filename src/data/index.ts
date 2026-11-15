import { z } from 'zod';
import { ReferenceDataSchema, SectionSchema, type ReferenceData } from './schema';
import odds from './odds.json';
import eventFocus from './event-focus.json';
import houseRules from './house-rules.json';
import skills from './skills.json';
import sections from './sections.json';
import examples from './examples.json';
import demoWorld from './demo-world.json';
import mythicTables from './mythic-tables.json';
import names from './names.json';
import items from './items.json';
import weapons from './weapons.json';
import vehicles from './vehicles.json';
import encounters from './encounters.json';
import services from './services.json';
import { MythicTablesSchema, withMythicTables } from './mythic';
import { NamesSchema, withNames } from './names';
import worlds from './worlds.json';

export * from './schema';
export * from './worlds';
export { nameSlotIds, nameSounds, type NameSound } from './names';
export { cityNames, type CityNames } from './city-names';

/** Die Referenzdaten, beim Start gegen die Schemas geprüft. Ein Fehler hier bricht den Start ab. */
export const referenceData: ReferenceData = ReferenceDataSchema.parse({
  odds,
  eventFocus,
  houseRules,
  skills,
  sections: withNames(withMythicTables(z.array(SectionSchema).parse(sections), MythicTablesSchema.parse(mythicTables)), NamesSchema.parse(names)),
  examples,
  demoWorld,
  items,
  weapons,
  vehicles,
  encounters,
  ...services,
  worlds,
});
