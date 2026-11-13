import {
  HANDS,
  addCharacter,
  rollSurprise,
  alarmAfterAttack,
  logDamage as logDamageWithAlarm,
  appendLog,
  askOracle,
  byName,
  campaignFileName,
  createCampaign,
  createDemoCampaign,
  DomainError,
  focusOf,
  fromCampaignFile,
  nextCampaignId,
  removeCampaign,
  removeCharacter,
  removeLogEntry,
  renameCampaign,
  pendingDamage,
  rollDamage,
  setWields,
  needsWounding,
  markDeath,
  victimOf,
  rollEncounter,
  endEncounter,
  adoptNpc,
  recover,
  turnOf,
  itemOf,
  characterOf,
  anyCharacterOf,
  setWears,
  fighterOf,
  endTurn,
  setDistance,
  moveSide,
  evadeTurn,
  isEscaped,
  currentEncounter,
  livingCharacters,
  canFight,
  woundStateOf,
  volleyStart,
  type RecoveryKind,
  type AttackResult,
  type DamageRoll,
  type PhysicalCharacteristic,
  spendRound,
  reload,
  book,
  buy,
  sell,
  setLocation,
  setQuantityDie,
  type BookingKind,
  restoreCharacter,
  chooseCascade as chooseCareerCascade,
  chooseGenerationWorld,
  runGeneration,
  hexId,
  isWorld,
  stateOf,
  enlist,
  finishGeneration,
  muster,
  reenlist,
  rollDice,
  rollPatron,
  rollRumor,
  rollAnimalEncounter,
  rollEventSaves,
  holdAfterAttack,
  isHeld,
  struggle,
  setTerrain,
  animalName,
  animalEventOf,
  rollEncounterCheck,
  rollPatronList,
  patronOfRoll,
  type EncounterCheck,
  writeNote,
  rollNext,
  rollSkill,
  nameWorld,
  noteWorld,
  discardWorld,
  hexAt,
  nextWorldAction,
  setGeneration,
  setHexes,
  setFocus,
  setOdds,
  startGeneration,
  toCampaignFile,
  updateCharacter,
  type Campaign,
  type CampaignId,
  type CampaignRepository,
  type CharacterInput,
  type Characteristic,
  type Clock,
  type Download,
  type Generation,
  type Hex,
  type ArmorClass,
  type Range,
  type CardRoll,
  type Random,
} from '../model';
import {
  attackRounds,
  canChooseFire,
  chooseFire,
  chooseSkill,
  chooseTarget,
  keepTarget,
  withoutFire,
  type Attack,
  rollAttack,
  chooseWeakened,
  startAttack,
  turnAttack,
  startWounding,
  assignWound,
  unassignWound,
  confirmWounding,
  confirmCard,
  drawCard,
  redrawCard,
  rollTask,
  startTask,
  toggleCharacteristic,
  togglePick,
  toggleRoll,
  drawNames,
  rollOccurrence,
  rollSurfaceAt,
  rollWorld,
  runWorld,
} from '../model/draft';
import { buildSnapshot, type ControllerState, type OpenWorld, type Screen, type Snapshot } from './snapshot';

/** Was beim Wechsel der Kampagne verfällt: Entwürfe und alles, was an ihnen hängt. */
const closedDrafts = { card: undefined, names: undefined, task: undefined, attack: undefined, wounding: undefined, combatNote: undefined, patronNote: undefined, rumorNote: undefined, animalNote: undefined, simTarget: undefined, simBurst: undefined, simWeakened: undefined, encounterIntro: false, surpriseShown: false, shopError: undefined, wearOffer: undefined, opened: undefined, result: undefined, editor: undefined, generating: false, generationError: undefined, world: undefined, worldError: undefined, selected: undefined, picking: false } as const;

/** Ein Test in Worten: „Test 3 (5+ nötig)“, bei zwei Würfeln „Test 3 + 4 = 7 (7+ nötig)“. */
function checkText(check: EncounterCheck): string {
  const thrown = check.dice.length === 1 ? String(check.total) : `${check.dice.join(' + ')} = ${check.total}`;
  return `Test ${thrown} (${check.target}+ nötig)`;
}

export interface GameDependencies {
  readonly repository: CampaignRepository;
  readonly random: Random;
  readonly clock: Clock;
  readonly download: Download;
  /** Ob der Speicher das Schließen der App übersteht. */
  readonly persistent?: boolean;
  /** Ob der Browser zusagt, den Speicher nicht zu löschen; `undefined`, wo er das nicht kennt. */
  readonly durable?: Promise<boolean | undefined>;
}

/**
 * Nimmt jede Eingabe der View an: eine Methode pro Absicht des Spielers. Ändert als Einziger das Model,
 * speichert den Spielstand, wählt den Screen und hält den Ablauf. Nach oben wird nur gemeldet
 * (`subscribe`, `snapshot`).
 */
export class GameController {
  private state: ControllerState;
  private current: Snapshot;
  private readonly listeners = new Set<() => void>();
  private saving: Promise<void> = Promise.resolve();
  /** Nach einem Fehler beim Laden schreibt die App nichts mehr, damit sie den alten Spielstand nicht überschreibt. */
  private writable = true;

  constructor(private readonly deps: GameDependencies) {
    this.state = {
      campaigns: [],
      campaign: undefined,
      campaignSheet: undefined,
      persistent: deps.persistent ?? true,
      durable: undefined,
      storageError: undefined,
      screen: 'oracle',
      card: undefined,
      names: undefined,
      task: undefined,
      attack: undefined,
      wounding: undefined,
      combatNote: undefined,
      patronNote: undefined,
      rumorNote: undefined,
      animalNote: undefined,
      simTarget: undefined,
      simBurst: undefined,
      simWeakened: undefined,
      encounterIntro: false,
      surpriseShown: false,
      shopError: undefined,
      wearOffer: undefined,
      opened: undefined,
      stripCollapsed: false,
      shopHintHidden: false,
      result: undefined,
      editor: undefined,
      generating: false,
      generationError: undefined,
      world: undefined,
      worldError: undefined,
      selected: undefined,
      picking: false,
    };
    this.current = buildSnapshot(this.state);
  }

  /**
   * Lädt die Kampagnen und öffnet die, die zuletzt offen war. Gibt es noch keine, beginnt die erste
   * mit den Beispielcharakteren. Lassen sich die Kampagnen nicht laden, läuft die App ohne Speichern
   * weiter: Die neue erste Kampagne darf keine gespeicherte mit derselben Id überschreiben.
   */
  async init(): Promise<void> {
    // Die Antwort des Browsers wartet nicht auf den Start; Firefox fragt dafür erst den Spieler.
    void this.deps.durable?.then((durable) => this.update({ durable }));
    let campaigns: readonly Campaign[] = [];
    let open: CampaignId | undefined;
    try {
      campaigns = await this.deps.repository.list();
    } catch (error) {
      this.writable = false;
      this.update({ persistent: false, storageError: `Der Spielstand ließ sich nicht laden: ${String(error)}. Damit nichts überschrieben wird, speichert die App bis zum nächsten Start nichts.` });
    }
    try {
      if (this.writable) open = await this.deps.repository.loadOpen();
    } catch {
      // Welche Kampagne offen war, ist nur eine Bequemlichkeit; dann öffnet sich die erste.
    }
    try {
      if (this.writable) this.update({ stripCollapsed: await this.deps.repository.loadStripCollapsed() });
    } catch {
      // Ob die Leiste eingeklappt war, ist nur eine Bequemlichkeit; dann ist sie offen.
    }
    try {
      if (this.writable) this.update({ shopHintHidden: await this.deps.repository.loadShopHintHidden() });
    } catch {
      // Ob der Hinweis im Shop weggeklickt war, ist nur eine Bequemlichkeit; dann steht er da.
    }
    const campaign = campaigns.find((c) => c.id === open) ?? byName(campaigns)[0];
    if (campaign) this.update({ campaigns, campaign });
    else this.addCampaign(createDemoCampaign(this.deps.clock));
  }

  // --- Verbindung zur View ---------------------------------------------------------------------

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly snapshot = (): Snapshot => this.current;

  /** Wartet, bis alle Änderungen gespeichert sind. */
  whenSaved(): Promise<void> {
    return this.saving;
  }

  // --- Kampagnen ------------------------------------------------------------------------------

  /** Öffnet die Kampagnenwahl. */
  showCampaigns(): void {
    this.update({ campaignSheet: { error: undefined } });
  }

  closeCampaigns(): void {
    this.update({ campaignSheet: undefined });
  }

  /** Wechselt in eine andere Kampagne; offene Karte und Probe verfallen. */
  openCampaign(id: CampaignId): void {
    const campaign = this.state.campaigns.find((c) => c.id === id);
    if (!campaign) throw new DomainError(`Die Kampagne ${id} gibt es nicht`);
    this.update({ ...closedDrafts, campaign, campaignSheet: undefined });
    this.persist(() => this.deps.repository.saveOpen(id));
  }

  /** Legt eine leere Kampagne an und öffnet sie. */
  createCampaign(name: string): void {
    this.inCampaignSheet(() => this.addCampaign(createCampaign([], name, nextCampaignId(this.state.campaigns))));
  }

  /** Benennt die offene Kampagne um. */
  renameCampaign(name: string): void {
    this.inCampaignSheet(() => this.change(renameCampaign(this.campaign, name)));
  }

  /** Löscht eine Kampagne endgültig. War sie offen, öffnet sich die erste der übrigen. */
  deleteCampaign(id: CampaignId): void {
    this.inCampaignSheet(() => {
      const campaigns = removeCampaign(this.state.campaigns, id);
      if (this.campaign.id !== id) {
        this.update({ campaigns });
      } else {
        const campaign = byName(campaigns)[0]!;
        this.update({ ...closedDrafts, campaigns, campaign });
        this.persist(() => this.deps.repository.saveOpen(campaign.id));
      }
      this.persist(() => this.deps.repository.remove(id));
    });
  }

  /** Bietet die Kampagne als Kampagnendatei zum Download an. */
  exportCampaign(id: CampaignId): void {
    const campaign = this.state.campaigns.find((c) => c.id === id);
    if (!campaign) throw new DomainError(`Die Kampagne ${id} gibt es nicht`);
    this.deps.download.offer(campaignFileName(campaign, this.deps.clock.now()), toCampaignFile(campaign), 'application/json');
  }

  /** Liest eine Kampagnendatei als neue Kampagne ein und öffnet sie; ist die Datei falsch, passiert nichts. */
  importCampaign(text: string): void {
    this.inCampaignSheet(() => this.addCampaign(fromCampaignFile(text, nextCampaignId(this.state.campaigns))));
  }

  // --- Orakel-Screen ---------------------------------------------------------------------------

  setOdds(odds: string): void {
    this.change(setOdds(this.campaign, odds));
  }

  askOracle(question?: string): void {
    this.change(appendLog(this.campaign, askOracle(this.campaign.odds, this.deps.random, this.deps.clock, question)));
  }

  rollDice(): void {
    this.change(appendLog(this.campaign, rollDice(this.deps.random, this.deps.clock)));
  }

  /**
   * Der Patron (SE, Charts S. 20): erst der Test der Woche (5+ auf 1W6). Besteht er, wählt ein Würfel
   * die Liste, dann kommt der Patron-Wurf mit den DMs der lebenden SC in den Log. Der Test steht nur
   * in der Karte, er wird nicht gespeichert.
   */
  rollPatron(): void {
    const check = rollEncounterCheck('patron', this.deps.random);
    if (!check.passed) {
      this.update({ patronNote: `${checkText(check)}: diese Woche kein Patron.` });
      return;
    }
    const entry = rollPatron(this.campaign, rollPatronList(this.deps.random), this.deps.random, this.deps.clock);
    // Eine Rumor-Zeile der Liste: gleich danach ein Gerücht, ohne Test (Charts S. 21).
    const rumor = patronOfRoll(entry).rumor;
    const entries = rumor ? [entry, rollRumor(this.deps.random, this.deps.clock)] : [entry];
    this.change(appendLog(this.campaign, ...entries), {
      patronNote: `${checkText(check)}: ${rumor ? 'ein Gerücht statt eines Patrons' : 'ein Patron'}.`,
      ...(rumor ? { rumorNote: 'Ohne Test: Gerücht statt eines Patrons.' } : {}),
    });
  }

  /**
   * Das Gerücht (SE, Charts S. 21): erst der Test der Woche (7+ auf 2W6), dann der Wurf auf die
   * Rumors Matrix; er kommt in den Log. Der Test steht nur in der Karte.
   */
  rollRumor(): void {
    const check = rollEncounterCheck('rumor', this.deps.random);
    if (!check.passed) {
      this.update({ rumorNote: `${checkText(check)}: diese Woche kein Gerücht.` });
      return;
    }
    this.change(appendLog(this.campaign, rollRumor(this.deps.random, this.deps.clock)), { rumorNote: `${checkText(check)}: ein Gerücht.` });
  }

  /** Eine Notiz, oder mit `interprets` (Stelle eines Ergebnisses im Log) eine Deutung dazu. */
  writeNote(text: string, interprets?: number): void {
    this.change(appendLog(this.campaign, writeNote(this.campaign.log, text, this.deps.clock, interprets)));
  }

  drawCard(question?: string): void {
    this.update({ card: drawCard(this.deps.random, question) });
  }

  togglePick(slot: string): void {
    this.update({ card: togglePick(this.openCard, slot) });
  }

  /** Wählt ein Wurffeld der offenen Karte aus oder nimmt es wieder heraus. */
  toggleRoll(roll: CardRoll): void {
    this.update({ card: toggleRoll(this.openCard, roll) });
  }

  /** Name von der Karte: öffnet die Namenswahl mit neu gezogenen Namen, auch wenn sie schon offen ist. */
  drawNames(): void {
    this.update({ names: drawNames(this.deps.random) });
  }

  closeNames(): void {
    this.update({ names: undefined });
  }

  redrawCard(): void {
    this.update({ card: redrawCard(this.openCard, this.deps.random) });
  }

  discardCard(): void {
    this.update({ card: undefined });
  }

  confirmCard(): void {
    const pick = confirmCard(this.openCard, this.deps.clock);
    this.change(appendLog(this.campaign, pick), { card: undefined });
  }

  /** Löscht einen Logeintrag endgültig, ein Ergebnis mit seinen Deutungen. */
  deleteLogEntry(index: number): void {
    const campaign = removeLogEntry(this.campaign, index);
    // Schaden, der gerade verteilt wird, verweist auf seinen Treffer im Log; die Stelle rückt mit, oder
    // der Treffer ist weg, dann auch das Verteilen.
    const wounding = this.state.wounding;
    const hit = wounding && campaign.log.indexOf(this.campaign.log[wounding.of]!);
    this.change(campaign, { result: undefined, wounding: wounding && hit !== undefined && hit >= 0 ? { ...wounding, of: hit } : undefined });
  }

  // --- Charakter oben und Proben ---------------------------------------------------------------

  showScreen(screen: Screen): void {
    this.update({ screen });
  }

  /** Wischen: Ein anderer Charakter steht oben; eine vorbereitete Probe und ein vorbereiteter Angriff enden. */
  focusCharacter(id: string): void {
    if (focusOf(this.campaign)?.id === id) return;
    // In der Kampfsimulation: Ist ein NSC am Zug, wird der SC, zu dem man wischt, sein Ziel.
    const npcTurn = turnOf(this.campaign)?.side === 'npcs';
    this.change(setFocus(this.campaign, id), { task: undefined, attack: undefined, ...(npcTurn ? { simTarget: id } : {}) });
  }

  /** Klappt die Leiste mit dem Charakter oben ein oder auf; das Gerät merkt es sich. */
  toggleStrip(): void {
    const stripCollapsed = !this.state.stripCollapsed;
    this.update({ stripCollapsed });
    this.persist(() => this.deps.repository.saveStripCollapsed(stripCollapsed));
  }

  /** Blendet den Hinweis über den Waffen im Shop aus; das Gerät merkt es sich. */
  hideShopHint(): void {
    if (this.state.shopHintHidden) return;
    this.update({ shopHintHidden: true });
    this.persist(() => this.deps.repository.saveShopHintHidden(true));
  }

  /**
   * Wählt die Fertigkeit des Charakters oben für die Probe; `null` heißt „ohne Fertigkeit“. Ohne
   * vorbereitete Probe beginnt sie mit dieser Wahl. Dieselbe noch einmal nimmt die Wahl zurück.
   */
  chooseSkill(skill: string | null): void {
    this.update({ task: chooseSkill(this.state.task ?? startTask(this.campaign), this.campaign, skill) });
  }

  /** Beendet die vorbereitete Probe, ohne zu würfeln. */
  endTask(): void {
    this.update({ task: undefined });
  }

  /** Im Charakter-Screen: klappt die Details eines Charakters auf oder zu (volle Namen, Ausrüstung, Notiz, Lebenslauf). */
  toggleDetails(id: string): void {
    this.update({ opened: this.state.opened === id ? undefined : id });
  }

  toggleCharacteristic(characteristic: Characteristic): void {
    this.update({ task: toggleCharacteristic(this.openTask, this.campaign, characteristic) });
  }

  /** Würfelt die Probe, schreibt sie in den Log und zeigt das Ergebnis als Popup. */
  rollTask(): void {
    const result = rollTask(this.openTask, this.campaign, this.deps.random, this.deps.clock);
    const campaign = appendLog(this.campaign, result);
    this.change(campaign, { result: campaign.log.length - 1 });
  }

  // --- Kampf ------------------------------------------------------------------------------------

  /** Wechselt die Waffe in der Hand des Charakters oben; das Ziel bleibt, wenn die Waffe dort hinreicht. */
  wieldWeapon(weapon: string): void {
    const character = focusOf(this.campaign);
    if (!character) throw new DomainError('Es gibt keinen lebenden Charakter.');
    const campaign = setWields(this.campaign, character.id, weapon);
    this.change(campaign, { attack: this.state.attack && keepTarget(withoutFire(this.state.attack), campaign) });
  }

  /** Wählt Rüstung und Reichweite des Ziels; dieselbe Zelle noch einmal nimmt die Reichweite zurück. */
  chooseTarget(armor: ArmorClass, range: Range): void {
    const attack = this.state.attack ?? startAttack(this.campaign);
    if (attack.armor === armor && attack.range === range) {
      const rest = Object.fromEntries(Object.entries(attack).filter(([key]) => key !== 'range'));
      this.update({ attack: attack.against === undefined ? undefined : rest });
    } else this.update({ attack: chooseTarget(this.campaign, armor, range, attack) });
  }

  /** Nimmt das Ziel und einen angreifenden NSC zurück, ohne zu würfeln. */
  endAttack(): void {
    this.update({ attack: undefined });
  }

  /**
   * Würfelt den Angriff (bei Feuerstoß und Schrot die ganze Garbe), schreibt ihn in den Log und zeigt
   * das Ergebnis als Popup; das Ziel bleibt gewählt. Eine Schusswaffe verbraucht einen Schuss, ein
   * Feuerstoß so viele, wie er braucht.
   */
  rollAttack(): void {
    const attack = this.state.attack ?? {};
    const campaign = this.logAttack(this.campaign, attack);
    this.change(campaign, { result: volleyStart(campaign.log, campaign.log.length - 1) });
  }

  /**
   * Feuerstoß oder Einzelschuss, wenn die Waffe beides kann: in der Kampfsimulation für den, der am
   * Zug ist, sonst für den Angriff in Vorbereitung.
   */
  chooseFire(burst: boolean): void {
    this.inFight(() => {
      const turn = turnOf(this.campaign);
      if (!turn) {
        this.update({ attack: chooseFire(this.state.attack ?? startAttack(this.campaign), this.campaign, burst), combatNote: undefined });
        return;
      }
      const weapon = fighterOf(this.campaign, turn.id).weapon;
      if (!canChooseFire(weapon)) throw new DomainError(`${weapon.name} hat keine Wahl zwischen Feuerstoß und Einzelschuss.`);
      this.update({ simBurst: burst, combatNote: undefined });
    });
  }

  /**
   * Schlag oder Hieb voll (`false`) oder freiwillig geschwächt (`true`), damit er nicht gegen die END
   * zählt (SR 22): in der Kampfsimulation für den SC am Zug, sonst für den Angriff in Vorbereitung.
   */
  chooseWeakened(weakened: boolean): void {
    this.inFight(() => {
      const turn = turnOf(this.campaign);
      if (!turn) {
        this.update({ attack: chooseWeakened(this.state.attack ?? startAttack(this.campaign), weakened), combatNote: undefined });
        return;
      }
      if (turn.side !== 'pcs') throw new DomainError('Ein NSC schwächt seinen Schlag nicht freiwillig.');
      this.update({ simWeakened: weakened, combatNote: undefined });
    });
  }

  /** Würfelt den Angriff als Garbe, hängt sie an den Log und zieht die verbrauchten Schuss ab. */
  private logAttack(campaign: Campaign, attack: Attack): Campaign {
    const results = rollAttack(attack, campaign, this.deps.random, this.deps.clock);
    const rounds = attackRounds(attack, campaign);
    // Ein Schuss mit Überraschung gibt Alarm, außer mit einem Laser (SR 20).
    const logged = holdAfterAttack(alarmAfterAttack(appendLog(campaign, ...results), results), results);
    // SC wie NSC verbrauchen ihre Munition.
    return spendRound(logged, results[0]!.for, rounds);
  }

  /**
   * Würfelt eine Begegnung auf dem Aufenthaltsort, zufällig oder von dieser Art, mit Gelände für die
   * Entfernung; die Zeilen 61–66 sind leer. Mit der Begegnung beginnt die Kampfsimulation; erst
   * zeigt die Übersicht, wer kommt.
   */
  rollEncounter(roll?: number, terrain?: string): void {
    try {
      // Erst der Test des Tages (5+ auf 1W6); wer die Art wählt, überspringt ihn.
      const check = roll === undefined && this.campaign.location !== undefined && !currentEncounter(this.campaign) ? rollEncounterCheck('random', this.deps.random) : undefined;
      if (check && !check.passed) {
        this.update({ combatNote: `${checkText(check)}: heute keine Begegnung.` });
        return;
      }
      const rolled = rollEncounter(this.campaign, this.deps.random, this.deps.clock, roll, undefined, terrain);
      const prepared = rolled.encounter ? this.prepareTurn(rolled.campaign, undefined) : { campaign: rolled.campaign, simTarget: undefined };
      this.change(prepared.campaign, {
        attack: undefined,
        simTarget: prepared.simTarget,
        encounterIntro: rolled.encounter !== undefined,
        combatNote: rolled.encounter ? undefined : `${check ? `${checkText(check)}, ` : ''}Wurf ${rolled.roll}: keine Begegnung.`,
      });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ combatNote: error.message });
    }
  }

  /**
   * Tiere (SE 18–19, SR 47): erst der Test (5+ auf 1W6), dann 2W6 auf die Tiertabelle von Welt und
   * Gelände; sie entsteht beim ersten Wurf. Ein Ereignis kommt in den Log, ein Tier wird eine
   * Begegnung mit Übersicht. Wer die Zeile wählt, überspringt den Test.
   */
  rollAnimals(row?: number): void {
    try {
      const check = row === undefined ? rollEncounterCheck('animal', this.deps.random) : undefined;
      if (check && !check.passed) {
        this.update({ animalNote: `${checkText(check)}: keine Tiere.` });
        return;
      }
      const rolled = rollAnimalEncounter(this.campaign, this.deps.random, this.deps.clock, row);
      const prefix = check ? `${checkText(check)}, ` : '';
      if (!rolled.encounter) {
        this.change(rolled.campaign, { animalNote: `${prefix}Wurf ${rolled.roll}: Ereignis ${animalEventOf(rolled.row.event!).name}.` });
        return;
      }
      const prepared = this.prepareTurn(rolled.campaign, undefined);
      this.change(prepared.campaign, { attack: undefined, simTarget: prepared.simTarget, encounterIntro: true, animalNote: `${prefix}Wurf ${rolled.roll}: ${animalName(rolled.row)}.`, combatNote: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ animalNote: error.message });
    }
  }

  /** Würfelt die Rettungswürfe aller lebenden SC gegen das Ereignis an der Stelle `index`; wer scheitert, bekommt den Schaden. */
  rollEventSaves(index: number): void {
    try {
      const campaign = rollEventSaves(this.campaign, index, this.deps.random, this.deps.clock);
      const saves = campaign.log.slice(this.campaign.log.length).filter((e) => e.kind === 'save').length;
      const hurt = campaign.log.slice(this.campaign.log.length).filter((e) => e.kind === 'damage').length;
      this.change(campaign, { animalNote: `${saves} Rettungswürfe: ${hurt === 0 ? 'alle geschafft.' : `${hurt} ${hurt === 1 ? 'misslungen' : 'misslungen'}, Schaden im Log.`}` });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ animalNote: error.message });
    }
  }

  /** Stellt das Gelände der Kampagne ein, für alle Begegnungsarten; leer heißt: ohne Gelände. */
  setTerrain(terrain: string | undefined): void {
    this.inFight(() => this.change(setTerrain(this.campaign, terrain), { combatNote: undefined, animalNote: undefined }));
  }

  /**
   * Schließt die Übersicht der Begegnung; der Reiter bleibt. Nach dem Würfeln ist das der Reiter
   * Begegnung: Nicht jede Begegnung wird ein Kampf, dorthin geht es erst mit „Zum Kampf“.
   */
  /** Der erste Wurf im Kampf: die Überraschung (S. 5). Danach ist der Erste am Zug; der Wurf steht im Vordergrund. */
  rollSurprise(): void {
    this.inFight(() => {
      const prepared = this.prepareTurn(rollSurprise(this.campaign, this.deps.random), undefined);
      this.change(prepared.campaign, { simTarget: prepared.simTarget, surpriseShown: true, combatNote: undefined });
    });
  }

  /** Schließt den Wurf auf die Überraschung; der Kampf beginnt. */
  closeSurprise(): void {
    this.update({ surpriseShown: false });
  }

  closeEncounterIntro(): void {
    this.update({ encounterIntro: false });
  }

  /** Zeigt die Übersicht der laufenden Begegnung noch einmal. */
  showEncounterIntro(): void {
    this.update({ encounterIntro: true });
  }

  /** Im Kampf: Die Gruppe ist auf dieser fertigen Welt (wie „Gruppe ist hier“ auf der Weltkarte). */
  stayAt(id: string): void {
    this.inFight(() => this.change(setLocation(this.campaign, id), { combatNote: undefined }));
  }

  /** Stellt den Würfel der Anzahl für kommende Begegnungen ein: W6 nach den Regeln, W4 oder W3 zum Ausgleichen. */
  setQuantityDie(die: number): void {
    this.inFight(() => this.change(setQuantityDie(this.campaign, die), { combatNote: undefined }));
  }

  /** Beendet die laufende Begegnung; der Reiter Kampf zeigt wieder die Waffentabelle, der Reiter Begegnung die Auswahl. */
  endEncounter(): void {
    this.change(endEncounter(this.campaign), { attack: undefined, combatNote: undefined, simTarget: undefined, encounterIntro: false });
  }

  // --- Kampfsimulation ----------------------------------------------------------------------------

  /**
   * Bereitet den Zug vor: Ist ein SC dran, steht er oben, und das Ziel bleibt oder wird der erste
   * NSC, der nicht tot ist. Ist ein NSC dran, schlägt die App einen zufälligen wachen SC als Ziel vor;
   * er steht oben.
   */
  private prepareTurn(campaign: Campaign, target: string | undefined): { campaign: Campaign; simTarget: string | undefined } {
    const turn = turnOf(campaign);
    const encounter = currentEncounter(campaign);
    if (!turn || !encounter) return { campaign, simTarget: undefined };
    if (turn.side === 'pcs') {
      const npcs = encounter.npcs.filter((n) => woundStateOf(campaign, n.id) !== 'dead');
      const keep = npcs.some((n) => n.id === target) ? target : npcs[0]?.id;
      return { campaign: focusOf(campaign)?.id === turn.id ? campaign : setFocus(campaign, turn.id), simTarget: keep };
    }
    // Ein entkommener SC ist kein Ziel; vorgeschlagen wird ein wacher SC in Reichweite, sonst irgendeiner.
    const pcs = livingCharacters(campaign);
    const near = pcs.filter((c) => !isEscaped(campaign, c.id));
    const awake = near.filter((c) => canFight(woundStateOf(campaign, c.id)));
    const pool = awake.length > 0 ? awake : near.length > 0 ? near : pcs;
    const pick = pool[this.deps.random.int(0, pool.length - 1)]!;
    return { campaign: focusOf(campaign)?.id === pick.id ? campaign : setFocus(campaign, pick.id), simTarget: pick.id };
  }

  /** Beendet den Zug (mit `evade` als Ausweichen) und bereitet den nächsten vor. */
  private nextTurn(campaign: Campaign, rest: Partial<ControllerState> = {}, evade = false): void {
    // Hat der Zug den Kampf entschieden, ist keiner mehr dran; dann gibt es nichts zu beenden.
    const ended = turnOf(campaign) ? (evade ? evadeTurn(campaign) : endTurn(campaign)) : campaign;
    const prepared = this.prepareTurn(ended, this.state.simTarget);
    this.change(prepared.campaign, { ...rest, simTarget: prepared.simTarget, simBurst: undefined, simWeakened: undefined, combatNote: undefined });
  }

  /** Führt eine Eingabe der Kampfsimulation aus; verletzt sie eine Regel, steht das im Kampf. */
  private inFight(step: () => void): void {
    try {
      step();
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ combatNote: error.message });
    }
  }

  /** Wer oben stehen muss, damit der Zug geht: der SC am Zug bzw. das Ziel des NSC am Zug. */
  private focusedForTurn(campaign: Campaign, target: string): Campaign {
    const turn = turnOf(campaign);
    if (!turn) return campaign;
    const top = turn.side === 'pcs' ? turn.id : target;
    return focusOf(campaign)?.id === top ? campaign : setFocus(campaign, top);
  }

  /** Wählt das Ziel des Zugs: für einen SC einen NSC, für einen NSC einen SC (er steht dann oben). */
  chooseFightTarget(id: string): void {
    this.inFight(() => {
      const turn = turnOf(this.campaign);
      if (!turn) throw new DomainError('Es ist keiner am Zug.');
      if (turn.side === 'pcs') {
        this.update({ simTarget: id, combatNote: undefined });
        return;
      }
      this.change(focusOf(this.campaign)?.id === id ? this.campaign : setFocus(this.campaign, id), { simTarget: id, combatNote: undefined });
    });
  }

  /** Setzt die Entfernung eines SC frei auf ein Band (21: entkommen); Berührung nur auf Band 0. */
  setBand(pc: string, band: number, close = false): void {
    this.inFight(() => this.change(setDistance(this.campaign, pc, band, close), { combatNote: undefined }));
  }

  /** Wer am Zug ist, geht ein Band näher (−1) oder weiter weg (+1), ein SC für sich, ein NSC mit der Gruppe: 1 Band gehend, ein zweites laufend. */
  moveBand(step: -1 | 1): void {
    this.inFight(() => {
      const before = turnOf(this.campaign)?.id;
      const moved = moveSide(this.campaign, step);
      // Nach dem Laufen ziehen die Kämpfer der Partei von selbst; ist danach ein anderer dran, wie nach einem Zug.
      if (turnOf(moved)?.id === before) this.change(moved, { combatNote: undefined });
      else {
        const prepared = this.prepareTurn(moved, this.state.simTarget);
        this.change(prepared.campaign, { simTarget: prepared.simTarget, simBurst: undefined, simWeakened: undefined, combatNote: undefined });
      }
    });
  }

  /**
   * Der Kämpfer am Zug greift sein Ziel an. Daneben beendet den Zug gleich; ein Treffer erst mit dem
   * Schaden. Wer für den Zug oben stehen muss, kommt vorher nach oben (auch nach Wischen in der Leiste).
   */
  fightAttack(): void {
    this.inFight(() => this.attackFrom(this.campaign));
  }

  /**
   * Der Kämpfer am Zug greift mit dieser Waffe an (Primär, Sekundär oder die Hände): Sie kommt in die
   * Hand, dann der Angriff wie `fightAttack`. SC und NSC gleich.
   */
  fightAttackWith(weapon: string): void {
    this.inFight(() => this.attackFrom(this.withWeaponInHand(weapon)));
  }

  /** Der Kämpfer am Zug lädt diese Waffe nach; sie kommt dabei in die Hand. Das ist sein Zug. */
  fightReloadWith(weapon: string): void {
    this.inFight(() => {
      const turn = turnOf(this.campaign);
      if (!turn) throw new DomainError('Es ist keiner am Zug.');
      this.nextTurn(reload(this.withWeaponInHand(weapon), turn.id));
    });
  }

  /** Die Kampagne, in der der Kämpfer am Zug diese Waffe in der Hand hat. */
  private withWeaponInHand(weapon: string): Campaign {
    const turn = turnOf(this.campaign);
    if (!turn) throw new DomainError('Es ist keiner am Zug.');
    const character = anyCharacterOf(this.campaign, turn.id);
    return (character.wields ?? HANDS) === weapon ? this.campaign : setWields(this.campaign, turn.id, weapon);
  }

  /** Der Kämpfer am Zug greift sein Ziel an. Daneben beendet den Zug gleich; ein Treffer erst mit dem Schaden. */
  private attackFrom(base: Campaign): void {
    const target = this.state.simTarget;
    if (target === undefined) throw new DomainError('Erst ein Ziel wählen.');
    const ready = this.focusedForTurn(base, target);
    const attack = { ...turnAttack(ready, target), ...(this.state.simBurst === undefined ? {} : { burst: this.state.simBurst }), ...(this.state.simWeakened ? { weakened: true } : {}) };
    const campaign = this.logAttack(ready, attack);
    const index = volleyStart(campaign.log, campaign.log.length - 1);
    if (pendingDamage(campaign.log) !== undefined && volleyStart(campaign.log, pendingDamage(campaign.log)!) === index) this.change(campaign, { result: index, combatNote: undefined });
    else this.nextTurn(campaign, { result: index });
  }

  /** Der Kämpfer am Zug lädt nach; das ist sein Zug. */
  fightReload(): void {
    this.inFight(() => {
      const turn = turnOf(this.campaign);
      if (!turn) throw new DomainError('Es ist keiner am Zug.');
      this.nextTurn(reload(this.campaign, turn.id));
    });
  }

  /** Der Kämpfer am Zug setzt aus. */
  skipTurn(): void {
    this.inFight(() => this.nextTurn(this.campaign));
  }

  /** Der Kämpfer am Zug weicht aus (SR 20): kein Angriff, dafür DM auf Angriffe gegen ihn bis zu seinem nächsten Zug. */
  evade(): void {
    this.inFight(() => {
      const turn = turnOf(this.campaign);
      if (turn && isHeld(this.campaign, turn.id)) throw new DomainError(`${anyCharacterOf(this.campaign, turn.id).name} ist festgehalten und kann nicht ausweichen.`);
      this.nextTurn(this.campaign, {}, true);
    });
  }

  /** Der SC am Zug ist festgehalten und reißt sich statt zu schlagen los (SR 48); das ist sein Zug. */
  struggle(): void {
    this.inFight(() => {
      const turn = turnOf(this.campaign);
      if (!turn) throw new DomainError('Es ist keiner am Zug.');
      const result = struggle(this.campaign, turn.id, this.deps.random);
      const name = anyCharacterOf(this.campaign, turn.id).name.split(' ')[0];
      const thrown = `${result.dice[0]} + ${result.dice[1]}${result.dm ? ` +${result.dm}` : ''} gegen ${result.target}+`;
      this.nextTurn(result.campaign);
      this.update({ combatNote: `${name} reißt sich los (${thrown}): ${result.freed ? 'frei!' : 'noch festgehalten.'}` });
    });
  }

  /**
   * Heilt einen SC (ohne Angabe den Charakter oben) oder einen NSC der laufenden Begegnung:
   * Aufwachen, Ruhe oder Behandlung durch einen SC, bei einer schweren Wunde in einer Einrichtung.
   */
  recover(how: RecoveryKind, npc: string | undefined, healer?: string, facility = false, pc?: string): void {
    try {
      const character = pc ?? focusOf(this.campaign)?.id;
      if (npc === undefined && character === undefined) throw new DomainError('Es gibt keinen lebenden Charakter.');
      const who = npc ?? character!;
      this.change(appendLog(this.campaign, recover(this.campaign, how, who, this.deps.random, this.deps.clock, healer, facility)), { combatNote: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ combatNote: error.message });
    }
  }

  /** Übernimmt die gewählten NSC auf einmal als SC oder als dauerhafte NSC. */
  adoptNpcs(npcs: readonly string[], asNpc: boolean): void {
    if (npcs.length === 0) return;
    const attack = this.state.attack;
    const involved = (id: string | undefined) => id !== undefined && npcs.includes(id);
    const keep = attack && !involved(attack.against) ? attack : undefined;
    this.change(
      npcs.reduce((campaign, npc) => adoptNpc(campaign, npc, asNpc), this.campaign),
      { attack: keep },
    );
  }

  /** Lädt die Schusswaffe in der Hand des Charakters oben mit einem Magazin aus seinem Besitz nach. */
  reload(): void {
    const character = focusOf(this.campaign);
    if (!character) throw new DomainError('Es gibt keinen lebenden Charakter.');
    this.change(reload(this.campaign, character.id));
  }

  // --- Shop und Gruppenkasse ---------------------------------------------------------------------

  /** Auf der Weltkarte: Die Gruppe ist auf der offenen Welt; noch einmal heißt: nirgends. */
  stayHere(): void {
    const at = this.state.world;
    if (!at) throw new DomainError('Es ist keine Weltkarte offen.');
    const id = hexId(at.column, at.row);
    this.change(setLocation(this.campaign, this.campaign.location === id ? undefined : id));
  }

  /** Bucht Geld: Einnahme oder Ausgabe frei, Einzahlung oder Auszahlung mit einem Charakter. */
  book(kind: Exclude<BookingKind, 'purchase' | 'sale'>, amount: number, text?: string, character?: string): void {
    this.inShop(() => book(this.campaign, kind, amount, this.deps.clock, text, character));
  }

  /** Verkauft auf dem Aufenthaltsort aus dem Besitz eines Charakters, zu diesem Erlös je Stück. */
  sell(item: string, count: number, price: number, character: string): void {
    this.inShop(() => sell(this.campaign, item, count, price, character, this.deps.clock));
  }

  /** Kauft auf dem Aufenthaltsort aus der Gruppenkasse für einen Charakter. Bei einer Rüstung, die er nicht trägt, fragt die App, ob er sie anlegt. */
  buy(item: string, count: number, character: string): void {
    this.inShop(() => buy(this.campaign, item, count, character, this.deps.clock));
    if (this.state.shopError === undefined && itemOf(item).armor !== undefined && characterOf(this.campaign, character).wears !== item) this.update({ wearOffer: { character, item } });
  }

  /** Nach dem Kauf einer Rüstung: anlegen (`true`) oder lassen, wie es ist. */
  answerWearOffer(wear: boolean): void {
    const offer = this.state.wearOffer;
    if (!offer) return;
    if (wear) this.inShop(() => setWears(this.campaign, offer.character, offer.item));
    this.update({ wearOffer: undefined });
  }

  /**
   * Würfelt den Schaden des neuesten Treffers, für den noch keiner gewürfelt ist, und zeigt den Wurf
   * im Vordergrund. Trifft er einen SC nach dessen erstem Treffer, verteilt der Spieler erst die Würfel.
   */
  rollDamage(): void {
    this.inFight(() => this.rollPendingDamage());
  }

  private rollPendingDamage(): void {
    const index = pendingDamage(this.campaign.log);
    if (index === undefined) throw new DomainError('Es gibt keinen Treffer ohne Schaden.');
    if (needsWounding(this.campaign, index)) {
      this.update({ wounding: startWounding(this.campaign, index, this.deps.random), result: undefined });
      return;
    }
    this.logDamage(rollDamage(this.campaign, index, this.deps.random, this.deps.clock));
  }

  /** Beim Verteilen: der nächste Block (ein Würfel oder sein Rest nach dem Überlauf) geht auf dieses Attribut. */
  assignWound(to: PhysicalCharacteristic): void {
    this.update({ wounding: assignWound(this.openWounding, this.campaign, to) });
  }

  /** Beim Verteilen: den zuletzt gewählten Block zurücknehmen. */
  unassignWound(): void {
    this.update({ wounding: unassignWound(this.openWounding, this.campaign) });
  }

  /** Sind alle Würfel verteilt, kommt der Schaden in den Log. */
  /** Sind alle Würfel verteilt, kommt der Schaden in den Log; die Würfel sind schon vor dem Verteilen gerollt. */
  confirmWounding(): void {
    this.inFight(() => this.logDamage(confirmWounding(this.openWounding, this.campaign, this.deps.clock), false));
  }

  /** Schreibt den Schaden in den Log. War es der Treffer dessen, der in der Simulation am Zug ist, endet sein Zug. */
  /** `show`: Der Schadenswurf rollt danach im Vordergrund; beim Verteilen ist er schon vorher gerollt. */
  private logDamage(roll: DamageRoll, show = true): void {
    if (roll.of === undefined) throw new DomainError('Schaden aus einem Ereignis würfelt man mit dem Rettungswurf.');
    const of = roll.of;
    const hit = this.campaign.log[of] as AttackResult;
    // Mit dem Schaden prüft das Model den Alarm: das Ziel schreit, oder ein Kamerad sieht es fallen (SR 20).
    const logged = logDamageWithAlarm(this.campaign, roll, this.deps.random);
    const who = victimOf(hit);
    const campaign = who ? markDeath(logged, who) : logged;
    const turn = turnOf(this.campaign);
    const ownTurn = turn !== undefined && hit.for === turn.id;
    const rest = { result: show ? campaign.log.length - 1 : undefined, wounding: undefined };
    // Bei einer Garbe endet der Zug erst, wenn der Schaden aller ihrer Treffer verteilt ist.
    const more = pendingDamage(campaign.log);
    const volleyDone = more === undefined || volleyStart(campaign.log, more) !== volleyStart(campaign.log, of);
    if (ownTurn && volleyDone) this.nextTurn(campaign, rest);
    else this.change(campaign, rest);
  }

  private get openWounding() {
    if (!this.state.wounding) throw new DomainError('Es wird kein Schaden verteilt.');
    return this.state.wounding;
  }

  /** „Weiter“: schließt das Ergebnis; die Probe bleibt vorbereitet, der Log darunter zeigt sie schon. */
  closeResult(): void {
    this.update({ result: undefined });
  }

  // --- Charaktere anlegen und bearbeiten -------------------------------------------------------

  newCharacter(): void {
    this.update({ editor: { id: undefined, error: undefined } });
  }

  editCharacter(id: string): void {
    this.update({ editor: { id, error: undefined } });
  }

  cancelEdit(): void {
    this.update({ editor: undefined });
  }

  saveCharacter(input: CharacterInput): void {
    const editor = this.state.editor;
    if (!editor) return;
    try {
      if (editor.id === undefined) {
        this.change(addCharacter(this.campaign, input).campaign, { editor: undefined });
      } else {
        const id = editor.id;
        // Die Fertigkeit der Probe kann weg sein: Wer den Charakter oben bearbeitet, beendet seine Probe.
        // Der Angriff bleibt, solange die Waffe in der Hand dorthin reicht.
        const top = focusOf(this.campaign)?.id === id;
        const task = top ? undefined : this.state.task;
        const campaign = updateCharacter(this.campaign, id, input);
        const attack = top && this.state.attack ? keepTarget(this.state.attack, campaign) : this.state.attack;
        this.change(campaign, { editor: undefined, task, attack });
      }
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ editor: { ...editor, error: error.message } });
    }
  }

  /** Entfernt den Charakter: gelöscht, wenn der Log nicht auf ihn verweist, sonst ausgeblendet. */
  removeCharacter(id: string): void {
    this.change(removeCharacter(this.campaign, id), { editor: undefined });
  }

  restoreCharacter(id: string): void {
    this.change(restoreCharacter(this.campaign, id));
  }

  // --- Charaktererschaffung -------------------------------------------------------------------

  /** Öffnet die Charaktererschaffung; läuft schon eine, geht es dort weiter. */
  openGeneration(): void {
    if (this.campaign.generation) this.update({ generating: true, generationError: undefined });
    else this.change(setGeneration(this.campaign, startGeneration()), { generating: true, generationError: undefined });
  }

  /** „Später weiter“: schließt die Erschaffung; sie bleibt gespeichert. */
  closeGeneration(): void {
    this.update({ generating: false, generationError: undefined, picking: false, selected: undefined });
  }

  /**
   * Heimatwelt oder Welt des Terms: eine fertige Welt wählen. Geht auch aus der Karte, wenn man dort
   * eine Welt antippt oder eine neue fertig erschafft.
   */
  chooseGenerationWorld(id: string): void {
    try {
      this.change(chooseGenerationWorld(this.campaign, id), { picking: false, selected: undefined, world: undefined, worldError: undefined, generationError: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ generationError: error.message });
    }
  }

  /** Öffnet die Karte über der Erschaffung, um eine Welt zu wählen oder zu erschaffen. */
  pickGenerationWorld(): void {
    const generation = this.campaign.generation;
    const step = generation && stateOf(generation).step;
    if (step !== 'homeworld' && step !== 'world') return;
    this.update({ picking: true, selected: undefined, generationError: undefined });
  }

  /** Schließt die Karte und kehrt zur Erschaffung zurück. */
  closePicker(): void {
    this.update({ picking: false, selected: undefined, worldError: undefined });
  }

  /** Verwirft die Erschaffung ohne Spur. */
  discardGeneration(): void {
    this.change(setGeneration(this.campaign, undefined), { generating: false, generationError: undefined });
  }

  /** Verwirft die Erschaffung (etwa nach dem Tod) und beginnt eine neue. */
  restartGeneration(): void {
    this.change(setGeneration(this.campaign, startGeneration()), { generating: true, generationError: undefined });
  }

  /** Würfelt den Schritt, der keine Wahl braucht (Attribut, Einberufung, Überleben, Patent, …). */
  rollGeneration(): void {
    this.inGeneration((g) => rollNext(g, this.deps.random));
  }

  /** Lässt die Erschaffung durchlaufen: alle Würfe, die Entscheidungen zufällig, bis zum Namen oder zum Tod. */
  runGeneration(): void {
    try {
      this.change(runGeneration(this.campaign, this.deps.random), { generationError: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ generationError: error.message });
    }
  }

  /** Wählt die Laufbahn und würfelt die Musterung. */
  chooseService(service: string): void {
    this.inGeneration((g) => enlist(g, service, this.deps.random));
  }

  /** Wählt die Fertigkeitstabelle und würfelt darauf. */
  chooseSkillTable(table: string): void {
    this.inGeneration((g) => rollSkill(g, table, this.deps.random));
  }

  /** Wählt aus einer Kaskade: Fertigkeit oder Waffe. */
  chooseCascade(skill: string): void {
    this.inGeneration((g) => chooseCareerCascade(g, skill));
  }

  /** Bleiben oder abmustern; gewürfelt wird in beiden Fällen. */
  reenlist(wants: boolean): void {
    this.inGeneration((g) => reenlist(g, wants, this.deps.random));
  }

  /** Ein Abmusterungswurf auf Geld oder Sachwerte. */
  musterOut(kind: 'cash' | 'benefit'): void {
    this.inGeneration((g) => muster(g, kind, this.deps.random));
  }

  /** Schließt die Erschaffung mit Namen ab; der neue Charakter steht oben im Orakel-Screen. */
  finishGeneration(name: string): void {
    try {
      this.change(finishGeneration(this.campaign, name).campaign, { generating: false, generationError: undefined, screen: 'oracle' });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ generationError: error.message });
    }
  }

  // --- Subsektor und Weltenerschaffung --------------------------------------------------------

  /**
   * Ein Feld des Subsektors antippen: Ein nicht erzeugtes oder leeres Feld wird auf der Karte
   * gewählt (unten steht dann das Vorkommen); eine Welt, auch in Erschaffung, öffnet ihre Weltkarte.
   * Dasselbe gewählte Feld noch einmal antippen hebt die Wahl auf.
   */
  chooseHex(column: number, row: number): void {
    const hex = hexAt(this.campaign.hexes, column, row);
    // Wird für die Erschaffung gewählt, ist eine fertige Welt die Wahl.
    if (this.state.picking && isWorld(hex)) return this.chooseGenerationWorld(hexId(column, row));
    const world = hex !== undefined && !hex.empty;
    if (world) return this.update({ world: { column, row, rolls: [] }, worldError: undefined, selected: undefined });
    const same = this.state.selected?.column === column && this.state.selected.row === row;
    this.update({ selected: same ? undefined : { column, row }, worldError: undefined });
  }

  /** Hebt die Wahl eines Feldes auf. */
  clearHex(): void {
    this.update({ selected: undefined, worldError: undefined });
  }

  /** Würfelt im Subsektor das Vorkommen des gewählten Feldes; das Feld bleibt gewählt und zeigt das Ergebnis. */
  rollOccurrence(): void {
    const at = this.state.selected;
    if (!at) throw new DomainError('Es ist kein Feld gewählt.');
    try {
      const { hexes, roll } = rollOccurrence(this.campaign.hexes, at.column, at.row, this.deps.random);
      this.change(setHexes(this.campaign, hexes), { selected: { ...at, occurrence: roll }, worldError: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ worldError: error.message });
    }
  }

  /** Schließt die Weltkarte; eine Welt in Erschaffung bleibt gespeichert. */
  closeWorld(): void {
    this.update({ world: undefined, worldError: undefined });
  }

  /** Würfelt den nächsten Wurf der offenen Welt; braucht sie nur noch die Oberfläche, diese. */
  rollWorld(): void {
    this.inWorld((hexes, at) => {
      const hex = hexAt(hexes, at.column, at.row);
      if (hex && nextWorldAction(hex) === 'surface') return { hexes: rollSurfaceAt(hexes, at.column, at.row, this.deps.random), world: at };
      const { hexes: next, roll } = rollWorld(hexes, at.column, at.row, this.deps.random);
      return { hexes: next, world: { ...at, rolls: [...at.rolls, roll] } };
    });
  }

  /** Lässt die offene Welt durchlaufen: alle Würfe bis zum Namen. */
  runWorld(): void {
    this.inWorld((hexes, at) => {
      const { hexes: next, rolls } = runWorld(hexes, at.column, at.row, this.deps.random);
      return { hexes: next, world: { ...at, rolls: [...at.rolls, ...rolls] } };
    });
  }

  /**
   * Im Subsektor durchlaufen: das Vorkommen des gewählten Feldes und, gibt es eine Welt, alle ihre
   * Würfe bis zum Namen; dann geht ihre Weltkarte auf.
   */
  runOccurrence(): void {
    const at = this.state.selected;
    if (!at) throw new DomainError('Es ist kein Feld gewählt.');
    try {
      const first = rollOccurrence(this.campaign.hexes, at.column, at.row, this.deps.random);
      if (!first.roll.success) return this.change(setHexes(this.campaign, first.hexes), { selected: { ...at, occurrence: first.roll }, worldError: undefined });
      const { hexes, rolls } = runWorld(first.hexes, at.column, at.row, this.deps.random);
      this.change(setHexes(this.campaign, hexes), { selected: undefined, world: { column: at.column, row: at.row, rolls: [first.roll, ...rolls] }, worldError: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ worldError: error.message });
    }
  }

  /** Gibt der fertig gewürfelten Welt ihren Namen. */
  nameWorld(name: string): void {
    const at = this.state.world;
    this.inWorld((hexes, open) => ({ hexes: nameWorld(hexes, open.column, open.row, name), world: open }));
    // Entstand die Welt für die Erschaffung, ist sie mit ihrem Namen gewählt.
    if (at && this.state.picking && isWorld(hexAt(this.campaign.hexes, at.column, at.row))) this.chooseGenerationWorld(hexId(at.column, at.row));
  }

  /** Setzt die Notiz der offenen Welt; eine leere Notiz entfernt sie. Nur für fertige Welten. */
  noteWorld(note: string): void {
    this.inWorld((hexes, at) => ({ hexes: noteWorld(hexes, at.column, at.row, note), world: at }));
  }

  /** Verwirft die Welt in Erschaffung; das Feld ist wieder nicht erzeugt. */
  discardWorld(): void {
    this.inWorld((hexes, at) => ({ hexes: discardWorld(hexes, at.column, at.row), world: undefined }));
  }

  // --- intern ----------------------------------------------------------------------------------

  /** Führt einen Schritt der Weltenerschaffung aus; verletzt er eine Regel, steht das auf der Weltkarte. */
  private inWorld(step: (hexes: readonly Hex[], at: OpenWorld) => { hexes: readonly Hex[]; world: OpenWorld | undefined }): void {
    const at = this.state.world;
    if (!at) throw new DomainError('Es ist keine Weltkarte offen.');
    try {
      const { hexes, world } = step(this.campaign.hexes, at);
      this.change(setHexes(this.campaign, hexes), { world, worldError: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ worldError: error.message });
    }
  }

  private get campaign(): Campaign {
    if (!this.state.campaign) throw new Error('Die Kampagne ist noch nicht geladen.');
    return this.state.campaign;
  }

  /** Führt eine Eingabe im Shop aus; verletzt sie eine Regel, steht das im Shop. */
  private inShop(step: () => Campaign): void {
    try {
      this.change(step(), { shopError: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ shopError: error.message });
    }
  }

  /** Führt einen Schritt der Erschaffung aus; verletzt er eine Regel, steht das in der Erschaffung. */
  private inGeneration(step: (generation: Generation) => Generation): void {
    const generation = this.campaign.generation;
    if (!generation) throw new DomainError('Es läuft keine Charaktererschaffung.');
    try {
      this.change(setGeneration(this.campaign, step(generation)), { generationError: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ generationError: error.message });
    }
  }

  private get openCard() {
    if (!this.state.card) throw new DomainError('Es ist keine Karte offen.');
    return this.state.card;
  }

  private get openTask() {
    if (!this.state.task) throw new DomainError('Es wird keine Probe vorbereitet.');
    return this.state.task;
  }

  /** Ändert die offene Kampagne und speichert sie. Steht danach ein anderer Charakter oben, enden Probe und Angriff. */
  private change(campaign: Campaign, rest: Partial<ControllerState> = {}): void {
    if (this.state.campaign && focusOf(this.state.campaign)?.id !== focusOf(campaign)?.id) rest = { ...rest, task: undefined, attack: undefined };
    const campaigns = this.state.campaigns.map((c) => (c.id === campaign.id ? campaign : c));
    this.update({ ...rest, campaigns, campaign });
    this.persist(() => this.deps.repository.save(campaign), true);
  }

  /** Nimmt eine neue Kampagne auf, öffnet und speichert sie. */
  private addCampaign(campaign: Campaign): void {
    this.update({ ...closedDrafts, campaigns: [...this.state.campaigns, campaign], campaign, campaignSheet: undefined });
    this.persist(() => this.deps.repository.save(campaign), true);
    this.persist(() => this.deps.repository.saveOpen(campaign.id));
  }

  /** Führt eine Eingabe aus der Kampagnenwahl aus; verletzt sie eine Regel, steht das in der Kampagnenwahl. */
  private inCampaignSheet(action: () => void): void {
    try {
      action();
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ campaignSheet: { error: error.message } });
    }
  }

  /**
   * Speichert der Reihe nach, damit nichts Älteres etwas Neueres überschreibt. Eine Fehlermeldung
   * nimmt erst eine gespeicherte Kampagne wieder weg (`saved`), nicht schon das Merken der offenen.
   */
  private persist(write: () => Promise<void>, saved = false): void {
    if (!this.writable) return;
    this.saving = this.saving.then(() =>
      write().then(
        () => {
          if (saved && this.state.storageError) this.update({ storageError: undefined });
        },
        (error: unknown) => this.update({ storageError: `Der Spielstand ließ sich nicht speichern: ${String(error)}` }),
      ),
    );
  }

  private update(patch: Partial<ControllerState>): void {
    this.state = { ...this.state, ...patch };
    this.current = buildSnapshot(this.state);
    for (const listener of this.listeners) listener();
  }
}
