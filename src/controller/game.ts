import {
  HANDS,
  addCharacter,
  rollSurprise,
  alarmAfterAttack,
  logDamage as logDamageWithAlarm,
  appendLog,
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
  editLogNote,
  renameCampaign,
  pendingDamage,
  rollDamage,
  setWields,
  needsWounding,
  markDeath,
  victimOf,
  rollEncounter,
  joinableNpcs,
  npcSideIds,
  type EncounterChoice,
  endEncounter,
  adoptNpc,
  recover,
  turnOf,
  anyCharacterOf,
  equip,
  unequip,
  type EquipSlot,
  type TrayStop,
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
  createPatronNpc,
  generateNpc,
  type NpcRole,
  rollRumor,
  rollAnimalEncounter,
  skillOf,
  sellGame,
  takeLoot,
  butcher,
  butchers,
  isDead,
  rollEventSaves,
  holdAfterAttack,
  isHeld,
  struggle,
  setTerrain,
  animalName,
  animalEventOf,
  rollCheck,
  checkOf,
  checksMet,
  checksLabel,
  checkNames,
  missingChecks,
  passTime,
  setStartDate,
  travel,
  journeyBlocker,
  rollNpcLow,
  travellersOf,
  hasAnimals,
  terrainOf,
  locationOf,
  type CheckKind,
  type CheckRoll,
  type PassageId,
  rollPatronList,
  stampDays,
  stampPlaces,
  patronOfRoll,
  type EncounterCheck,
  writeNote,
  rollNext,
  rollSkill,
  nameWorld,
  canHaveMap,
  withSurfaceMap,
  cityNamesTaken,
  renameCity,
  mapLocked,
  moveParty,
  planOptions,
  startTrip,
  travelDay,
  cancelTrip,
  moveNpc,
  type Place,
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
  type Cloud,
  type CloudFile,
  type Keys,
  type SyncMark,
  type SyncStep,
  CloudChanged,
  CloudExpired,
  CloudOffline,
  copyOf,
  fromCloudFile,
  markOf,
  planSync,
  stamped,
  touched,
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
  toggleOdds,
  askCard,
  drawNames,
  rollOccurrence,
  rollSurfaceAt,
  rollWorld,
  runWorld,
  choicesOf,
  type Conflict,
  type ConflictChoice,
} from '../model/draft';
import { buildSnapshot, type ControllerState, type OpenWorld, type Screen, type Snapshot, type SyncView } from './snapshot';

/** Was beim Wechsel der Kampagne verfällt: Entwürfe und alles, was an ihnen hängt. */
const closedDrafts = { card: undefined, names: undefined, task: undefined, attack: undefined, wounding: undefined, combatNote: undefined, joining: [], lootOpen: undefined, butchered: undefined, patronNote: undefined, rumorNote: undefined, animalNote: undefined, legalNote: undefined, timeNote: undefined, journey: undefined, tripPlan: undefined, tripNote: undefined, tripRoll: undefined, encounterRoll: undefined, encounterChoice: undefined, npcJoining: undefined, npcPlacing: undefined, simTarget: undefined, simBurst: undefined, simWeakened: undefined, encounterIntro: false, surpriseShown: false, shopError: undefined, opened: undefined, result: undefined, editor: undefined, generating: false, generationError: undefined, world: undefined, worldError: undefined, globe: undefined, selected: undefined, picking: false } as const;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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
  readonly keys: Keys;
  /** Wo die Kampagnen für den Abgleich liegen (OneDrive); fehlt sie, gibt es keinen Abgleich. */
  readonly cloud?: Cloud;
  /** Ruft `run` kurz nach einer Änderung auf, für den Abgleich; fehlt es, gleicht nur `sync()` ab. */
  readonly later?: (run: () => void) => void;
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
  /** Die Abgleichsmarken des Geräts, je Schlüssel. */
  private readonly marks = new Map<string, SyncMark>();
  /** Der laufende Abgleich; ein zweiter Wunsch währenddessen hängt einen weiteren Durchgang an. */
  private syncing: Promise<void> | undefined;
  private again = false;

  constructor(private readonly deps: GameDependencies) {
    this.state = {
      campaigns: [],
      campaign: undefined,
      campaignSheet: undefined,
      sync: { status: 'off', account: undefined, at: undefined, error: undefined },
      conflicts: [],
      persistent: deps.persistent ?? true,
      durable: undefined,
      storageError: undefined,
      screen: 'oracle',
      npcAll: false,
      npcPlacing: undefined,
      npcJoining: undefined,
      encounterRoll: undefined,
      encounterChoice: undefined,
      card: undefined,
      names: undefined,
      task: undefined,
      attack: undefined,
      wounding: undefined,
      combatNote: undefined,
      joining: [],
      lootOpen: undefined,
      butchered: undefined,
      patronNote: undefined,
      rumorNote: undefined,
      animalNote: undefined,
      legalNote: undefined,
      timeNote: undefined,
      journey: undefined,
      simTarget: undefined,
      simBurst: undefined,
      simWeakened: undefined,
      encounterIntro: false,
      surpriseShown: false,
      shopError: undefined,
      opened: undefined,
      stripCollapsed: false,
      shopHintHidden: false,
      trayStop: 'half',
      result: undefined,
      editor: undefined,
      generating: false,
      generationError: undefined,
      world: undefined,
      worldError: undefined,
      globe: undefined,
      selected: undefined,
      picking: false,
      tripPlan: undefined,
      tripNote: undefined,
      tripRoll: undefined,
      trace: false,
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
    try {
      const trayStop = this.writable ? await this.deps.repository.loadTrayStop() : undefined;
      if (trayStop !== undefined) this.update({ trayStop });
    } catch {
      // Wie weit das Ziehblatt hochgezogen war, ist nur eine Bequemlichkeit; dann steht es halb.
    }
    // Kampagnen von vor dem Abgleich bekommen Schlüssel und Änderungszeit, einmal und für immer.
    const loaded = campaigns;
    campaigns = loaded.map((c) => stamped(c, this.deps.keys, this.deps.clock));
    campaigns.forEach((c, i) => {
      if (c !== loaded[i]) this.persist(() => this.deps.repository.save(c), true);
    });
    const campaign = campaigns.find((c) => c.id === open) ?? byName(campaigns)[0];
    if (campaign) this.update({ campaigns, campaign, ...this.home(campaign), ...this.landing(campaign) });
    else this.addCampaign(createDemoCampaign(this.deps.clock, this.deps.keys.next()));
    await this.initSync();
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
    this.update({ ...this.closed(campaign), ...this.landing(campaign), campaign, campaignSheet: undefined });
    this.persist(() => this.deps.repository.saveOpen(id));
  }

  /** Legt eine leere Kampagne an und öffnet sie. */
  createCampaign(name: string): void {
    this.inCampaignSheet(() => this.addCampaign(createCampaign([], name, nextCampaignId(this.state.campaigns), this.newStamp())));
  }

  /** Benennt die offene Kampagne um. */
  renameCampaign(name: string): void {
    this.inCampaignSheet(() => this.change(renameCampaign(this.campaign, name)));
  }

  /** Löscht eine Kampagne endgültig. War sie offen, öffnet sich die erste der übrigen. */
  deleteCampaign(id: CampaignId): void {
    this.inCampaignSheet(() => {
      const campaigns = removeCampaign(this.state.campaigns, id);
      // War sie abgeglichen, merkt sich das Gerät, dass sie hier gelöscht ist; der Abgleich löscht sie dann dort.
      const mark = this.marks.get(this.state.campaigns.find((c) => c.id === id)?.key ?? '');
      if (mark) this.setMark({ ...mark, deleted: true });
      this.requestSync();
      if (this.campaign.id !== id) {
        this.update({ campaigns });
      } else {
        const campaign = byName(campaigns)[0]!;
        this.update({ ...this.closed(campaign), campaigns, campaign });
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
    this.inCampaignSheet(() => this.addCampaign(fromCampaignFile(text, nextCampaignId(this.state.campaigns), this.newStamp())));
  }

  // --- Abgleich mit OneDrive -------------------------------------------------------------------

  /** Meldet bei OneDrive an und gleicht ab. Verlässt die App dafür die Seite, geht es beim nächsten Start weiter. */
  async signIn(): Promise<void> {
    const cloud = this.deps.cloud;
    if (!cloud) return;
    try {
      await cloud.signIn();
      const account = await cloud.account();
      this.setSync({ account, status: account ? 'synced' : 'signedOut', error: undefined });
    } catch (error) {
      this.setSync({ status: 'error', error: `Die Anmeldung ist gescheitert: ${messageOf(error)}` });
      return;
    }
    await this.sync();
  }

  /** Meldet ab. Die Kampagnen bleiben hier und in OneDrive, wie sie sind; die Abgleichsmarken sind weg. */
  async signOut(): Promise<void> {
    const cloud = this.deps.cloud;
    if (!cloud) return;
    await this.syncing;
    try {
      await cloud.signOut();
    } catch {
      // Auch wenn das Abmelden dort scheitert: Hier wird nicht mehr abgeglichen.
    }
    this.marks.clear();
    this.persist(() => this.deps.repository.clearMarks());
    this.update({ conflicts: [], sync: { status: 'signedOut', account: undefined, at: undefined, error: undefined } });
  }

  /**
   * Gleicht die Kampagnen mit OneDrive ab: beim Start, wenn die App wieder in den Vordergrund
   * kommt, und kurz nach jeder Änderung. Läuft schon ein Abgleich, folgt ihm ein weiterer.
   */
  sync(): Promise<void> {
    if (!this.deps.cloud || !this.state.sync.account || !this.writable) return Promise.resolve();
    if (this.syncing) {
      this.again = true;
      return this.syncing;
    }
    this.syncing = (async () => {
      // Höchstens ein paar Durchgänge am Stück, damit ein Fehler dort keine Schleife wird.
      for (let round = 0; round < 4; round++) {
        this.again = false;
        await this.syncOnce();
        if (!this.again) break;
      }
    })().finally(() => {
      this.syncing = undefined;
    });
    return this.syncing;
  }

  /** Löst einen Konflikt: Der Stand von hier gilt (`local`), der aus OneDrive (`remote`), oder beide bleiben (`both`). */
  async resolveConflict(key: string, choice: ConflictChoice): Promise<void> {
    const cloud = this.deps.cloud;
    const conflict = this.state.conflicts.find((c) => c.key === key);
    if (!cloud || !conflict) return;
    await this.syncing;
    const local = this.state.campaigns.find((c) => c.key === key);
    const { remote, revision } = conflict;
    try {
      if (!choicesOf(conflict, this.state.campaigns).includes(choice)) throw new DomainError('Diese Wahl gibt es in diesem Konflikt nicht.');
      // Die letzte Kampagne des Geräts wird nie gelöscht; sie bleibt und wird wieder hochgeladen.
      const keepLast = choice === 'remote' && !remote && this.state.campaigns.length === 1;
      if (choice === 'local' || keepLast) {
        if (local) await this.upload(local, revision);
        else if (revision !== undefined) {
          await cloud.remove(key, revision);
          this.dropMark(key);
        }
      } else if (choice === 'remote') {
        if (remote && revision !== undefined) {
          this.put({ ...remote, id: local?.id ?? nextCampaignId(this.state.campaigns) });
          this.setMark(markOf(remote, revision));
        } else if (local) {
          this.drop(local.id);
          this.dropMark(key);
        }
      } else if (local && remote && revision !== undefined) {
        // Beide behalten: Der Stand von hier wird die Kopie mit neuem Schlüssel, der von dort kommt daneben.
        this.put(copyOf(local, this.deps.keys, this.deps.clock));
        this.put({ ...remote, id: nextCampaignId(this.state.campaigns) });
        this.setMark(markOf(remote, revision));
      }
    } catch (error) {
      // Hat sich OneDrive inzwischen noch einmal geändert, findet der nächste Abgleich den Konflikt neu.
      if (!(error instanceof CloudChanged)) {
        this.failSync(error);
        return;
      }
    }
    this.update({ conflicts: this.state.conflicts.filter((c) => c.key !== key) });
    await this.sync();
  }

  /** Beim Start: die Marken laden und, wenn jemand angemeldet ist, abgleichen (ohne darauf zu warten). */
  private async initSync(): Promise<void> {
    const cloud = this.deps.cloud;
    if (!cloud || !this.writable) return;
    try {
      for (const mark of await this.deps.repository.loadMarks()) this.marks.set(mark.key, mark);
      const account = await cloud.account();
      // Ohne Anmeldung, aber mit Abgleichsmarken hat sich niemand selbst abgemeldet (das löscht die
      // Marken): Die Anmeldung ging verloren, etwa mit einer neuen Fassung der App.
      this.setSync({ account, status: account ? 'synced' : this.marks.size > 0 ? 'expired' : 'signedOut' });
    } catch (error) {
      this.setSync({ status: 'error', error: `Die Anmeldung ließ sich nicht prüfen: ${messageOf(error)}` });
      return;
    }
    void this.sync();
  }

  private async syncOnce(): Promise<void> {
    const cloud = this.deps.cloud!;
    this.setSync({ status: 'syncing', error: undefined });
    try {
      await this.saving;
      const remote = await cloud.list();
      const steps = planSync(this.state.campaigns, [...this.marks.values()], remote, this.state.conflicts.map((c) => c.key));
      const problems: string[] = [];
      for (const step of steps) {
        try {
          await this.syncStep(step, remote.find((f) => f.key === step.key));
        } catch (error) {
          // Dort inzwischen geändert: Der nächste Durchgang sieht es. Eine kaputte Datei hält die übrigen nicht auf.
          if (error instanceof CloudChanged) this.again = true;
          else if (error instanceof DomainError) problems.push(error.message);
          else throw error;
        }
      }
      this.setSync({ status: problems.length ? 'error' : 'synced', at: this.deps.clock.now(), error: problems[0] });
    } catch (error) {
      this.again = false;
      this.failSync(error);
    }
  }

  private async syncStep(step: SyncStep, file: CloudFile | undefined): Promise<void> {
    const cloud = this.deps.cloud!;
    const { key } = step;
    const local = this.state.campaigns.find((c) => c.key === key);
    const mark = this.marks.get(key);
    const readRemote = async (): Promise<{ campaign: Campaign; revision: string } | undefined> => {
      const got = file && (await cloud.read(key));
      return got && { campaign: fromCloudFile(got.text, local?.id ?? nextCampaignId(this.state.campaigns), key), revision: got.revision };
    };
    // Wurde hier gespielt, während der Abgleich auf das Netz wartete, gilt der Schritt nicht mehr.
    const stale = (): boolean => {
      const now = this.state.campaigns.find((c) => c.key === key);
      if (now?.changedAt === local?.changedAt) return false;
      this.again = true;
      return true;
    };
    switch (step.kind) {
      case 'upload':
        if (local) await this.upload(local, mark?.revision);
        return;
      case 'download': {
        const got = await readRemote();
        if (!got || stale()) return;
        this.put(got.campaign);
        this.setMark(markOf(got.campaign, got.revision));
        return;
      }
      case 'removeRemote':
        if (mark) await cloud.remove(key, mark.revision);
        this.dropMark(key);
        return;
      case 'removeLocal':
        this.dropMark(key);
        // Die letzte Kampagne des Geräts wird nie gelöscht; sie bleibt und wird wieder hochgeladen.
        if (local && this.state.campaigns.length === 1) await this.upload(local, undefined);
        else if (local) this.drop(local.id);
        return;
      case 'forget':
        this.dropMark(key);
        return;
      case 'conflict': {
        const got = await readRemote();
        if (stale()) return;
        if (!local && !got) {
          this.dropMark(key);
          return;
        }
        // Gleich alt heißt gleich: kein Konflikt, nur die Marke fehlte (etwa nach erneutem Anmelden).
        if (local && got && local.changedAt === got.campaign.changedAt) {
          this.setMark(markOf(local, got.revision));
          return;
        }
        const conflict: Conflict = { key, ...(got ? { remote: got.campaign, revision: got.revision } : {}) };
        // Der Abgleich fragt: Die Kampagnenwahl geht auf, dort steht der Konflikt.
        this.update({ conflicts: [...this.state.conflicts, conflict], campaignSheet: this.state.campaignSheet ?? { error: undefined } });
        return;
      }
    }
  }

  /** Lädt eine Kampagne hoch; `revision` ist die Fassung, die dort ersetzt wird, ohne sie darf es dort keine geben. */
  private async upload(campaign: Campaign, revision: string | undefined): Promise<void> {
    const next = await this.deps.cloud!.write(campaign.key, toCampaignFile(campaign), revision);
    this.setMark(markOf(campaign, next));
  }

  /** Nimmt einen Stand aus OneDrive auf: ersetzt die Kampagne mit derselben Id oder kommt als weitere dazu. */
  private put(campaign: Campaign): void {
    const known = this.state.campaigns.some((c) => c.id === campaign.id);
    const campaigns = known ? this.state.campaigns.map((c) => (c.id === campaign.id ? campaign : c)) : [...this.state.campaigns, campaign];
    // Wird die offene Kampagne ersetzt, sind die Entwürfe weg, wie beim Wechseln.
    if (this.state.campaign?.id === campaign.id) this.update({ ...this.closed(campaign), campaigns, campaign });
    else this.update({ campaigns });
    this.persist(() => this.deps.repository.save(campaign), true);
  }

  /** Nimmt eine Kampagne vom Gerät, weil sie in OneDrive gelöscht ist. War sie offen, öffnet sich die erste nach Namen. */
  private drop(id: CampaignId): void {
    const campaigns = this.state.campaigns.filter((c) => c.id !== id);
    if (this.state.campaign?.id !== id) {
      this.update({ campaigns });
    } else {
      const campaign = byName(campaigns)[0]!;
      this.update({ ...this.closed(campaign), campaigns, campaign });
      this.persist(() => this.deps.repository.saveOpen(campaign.id));
    }
    this.persist(() => this.deps.repository.remove(id));
  }

  private setMark(mark: SyncMark): void {
    this.marks.set(mark.key, mark);
    this.persist(() => this.deps.repository.saveMark(mark));
  }

  private dropMark(key: string): void {
    if (!this.marks.delete(key)) return;
    this.persist(() => this.deps.repository.removeMark(key));
  }

  private setSync(patch: Partial<SyncView>): void {
    this.update({ sync: { ...this.state.sync, ...patch } });
  }

  private failSync(error: unknown): void {
    if (error instanceof CloudOffline) this.setSync({ status: 'offline', error: undefined });
    else if (error instanceof CloudExpired) this.setSync({ status: 'expired', error: undefined });
    else this.setSync({ status: 'error', error: `Der Abgleich ist gescheitert: ${messageOf(error)}` });
  }

  /** Stößt den Abgleich kurz nach einer Änderung an. */
  private requestSync(): void {
    if (this.state.sync.account) this.deps.later?.(() => void this.sync());
  }

  private newStamp(): { key: string; changedAt: string } {
    return { key: this.deps.keys.next(), changedAt: this.deps.clock.now() };
  }

  // --- Orakel-Screen ---------------------------------------------------------------------------

  setOdds(odds: string): void {
    this.change(setOdds(this.campaign, odds));
  }

  rollDice(): void {
    this.change(appendLog(this.campaign, rollDice(this.deps.random, this.deps.clock)));
  }

  /**
   * Der Patron (SE, Charts S. 20): erst der Test der Woche (5+ auf 1W6). Besteht er, wählt ein Würfel
   * die Liste, dann kommt der Patron-Wurf mit den DMs der lebenden SC in den Log. Der Test steht nur
   * in der Karte, er wird nicht gespeichert.
   */
  rollPatron(force = false): void {
    const tested = this.test('patron', force, (note) => this.update({ patronNote: note }));
    if (!tested) return;
    const { entry: test, check } = tested;
    if (!check.passed) {
      this.change(appendLog(this.campaign, test), { patronNote: `${checkText(check)}: diese Woche kein Patron.`, ...this.shown('patron', check, 'Diese Woche kein Patron.') });
      return;
    }
    const entry = rollPatron(this.campaign, rollPatronList(this.deps.random), this.deps.random, this.deps.clock);
    // Eine Rumor-Zeile der Liste: gleich danach ein Gerücht, ohne Test (Charts S. 21).
    const rumor = patronOfRoll(entry).rumor;
    const entries = rumor ? [test, entry, rollRumor(this.deps.random, this.deps.clock)] : [test, entry];
    this.change(appendLog(this.campaign, ...entries), {
      patronNote: `${checkText(check)}: ${rumor ? 'ein Gerücht statt eines Patrons' : 'ein Patron'}.`,
      ...(rumor ? { rumorNote: 'Ohne Test: Gerücht statt eines Patrons.' } : {}),
      ...this.shown('patron', check, rumor ? 'Ein Gerücht statt eines Patrons.' : 'Ein Patron!'),
    });
  }

  /**
   * Das Gerücht (SE, Charts S. 21): erst der Test der Woche (7+ auf 2W6), dann der Wurf auf die
   * Rumors Matrix; er kommt in den Log. Der Test steht nur in der Karte.
   */
  rollRumor(force = false): void {
    const tested = this.test('rumor', force, (note) => this.update({ rumorNote: note }));
    if (!tested) return;
    const { entry: test, check } = tested;
    if (!check.passed) {
      this.change(appendLog(this.campaign, test), { rumorNote: `${checkText(check)}: diese Woche kein Gerücht.`, ...this.shown('rumor', check, 'Diese Woche kein Gerücht.') });
      return;
    }
    this.change(appendLog(this.campaign, test, rollRumor(this.deps.random, this.deps.clock)), { rumorNote: `${checkText(check)}: ein Gerücht.`, ...this.shown('rumor', check, 'Ein Gerücht!') });
  }

  /**
   * Die Polizei (SE S. 20; einmal je Woche nach Wunsch des Owners): 2W6 gleich oder über der
   * Gesetzesstufe heißt Ruhe; sonst hält ein Polizist die Gruppe an, mit Reaktion. Der Test kommt in den Log.
   */
  rollLegal(force = false): void {
    try {
      const tested = this.test('legal', force, (note) => this.update({ legalNote: note }));
      if (!tested) return;
      const { entry, check } = tested;
      const reaction = entry.reactionDice === undefined ? '' : ` Reaktion ${entry.reactionDice[0]} + ${entry.reactionDice[1]}${entry.reactionDm ? ` ${entry.reactionDm > 0 ? '+' : '−'}${Math.abs(entry.reactionDm)}` : ''}.`;
      this.change(appendLog(this.campaign, entry), { legalNote: `${checkText(check)}: ${check.passed ? 'die Polizei lässt die Gruppe in Ruhe.' : `die Polizei hält die Gruppe an.${reaction}`}`, ...this.shown('legal', check, check.passed ? 'Die Polizei lässt die Gruppe in Ruhe.' : `Die Polizei hält die Gruppe an.${reaction}`) });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ legalNote: error.message, ...this.shown('legal', undefined, error.message) });
    }
  }

  /**
   * Das Würfelfenster eines Begegnungswurfs: mit Test die Würfel und was herauskam, ohne Test nur der
   * Hinweis. `encounter`: Danach folgt die Übersicht der Begegnung.
   */
  private shown(kind: CheckKind, check: EncounterCheck | undefined, text: string, encounter = false): Pick<ControllerState, 'encounterRoll' | 'encounterChoice'> {
    return { encounterRoll: { kind, dice: check?.dice ?? [], target: check?.target ?? 0, passed: check?.passed ?? false, text, encounter }, encounterChoice: undefined };
  }

  /** Schließt das Würfelfenster eines Begegnungswurfs; kam es zur Begegnung, folgt ihre Übersicht. */
  closeEncounterRoll(): void {
    const roll = this.state.encounterRoll;
    if (!roll) return;
    this.update({ encounterRoll: undefined, ...(roll.encounter ? { encounterIntro: true } : {}) });
  }

  /** „Manuell wählen“: öffnet die Auswahl der Art (Zufallsbegegnung) bzw. der Zeile (Tiere) statt des Wurfs. */
  chooseEncounter(kind: 'random' | 'animal'): void {
    this.update({ encounterChoice: kind });
  }

  /** Schließt die Auswahl ohne Wurf. */
  closeEncounterChoice(): void {
    // Dazugenommene NSC gelten nur für diesen Wurf.
    this.update({ encounterChoice: undefined, joining: [] });
  }

  /**
   * „NSC dazunehmen“: Der Reiter NSC öffnet sich zum Auswählen der NSC vom Aufenthaltsort; „OK“ nimmt
   * sie zur Zufallsbegegnung dazu und würfelt sie (mit `manual` erst die Auswahl der Art).
   */
  startNpcJoining(manual: boolean): void {
    this.update({ npcJoining: { manual }, npcPlacing: undefined, screen: 'npcs', npcAll: false, joining: [], globe: this.state.globe && { picked: undefined } });
  }

  /**
   * Würfelt den Test einer Art als Logeintrag, noch nicht gespeichert. Ist die Regel für den
   * Zeitraum schon erfüllt, nur mit `force` (langes Drücken); sonst sagt `blocked`, warum nicht.
   */
  private test(kind: CheckKind, force: boolean, blocked: (note: string) => void): { readonly entry: CheckRoll; readonly check: EncounterCheck } | undefined {
    if (!force && checksMet(this.campaign, kind)) {
      const note = `${checkNames[kind]}: ${checksLabel(this.campaign, kind)} getestet. Lange drücken für einen weiteren Test.`;
      blocked(note);
      this.update(this.shown(kind, undefined, note));
      return undefined;
    }
    const entry = rollCheck(this.campaign, kind, this.deps.random, this.deps.clock);
    return { entry, check: checkOf(entry) };
  }

  // --- Zeit und Reisen ---------------------------------------------------------------------------

  /** Lässt 1 bis 6 Tage vergehen, ohne Erinnerung an Tests (Wunsch des Owners). */
  passDays(days: number): void {
    this.passTime({ days }, true);
  }

  /**
   * Beendet die Woche: bis zum nächsten Sonntag. Fehlen diese Woche Tests (Polizei; Zufallsbegegnung
   * und Tiere, wenn sie gar nicht getestet sind; Patron und Gerücht nie), erinnert die App erst daran; mit
   * `force` (langes Drücken) endet die Woche trotzdem, ohne Begegnung.
   */
  endWeek(force = false): void {
    this.passTime('week', force);
  }

  private passTime(how: { readonly days: number } | 'week', force: boolean): void {
    try {
      const missing = missingChecks(this.campaign, how === 'week', this.animalsPossible());
      if (!force && missing.length > 0) {
        this.update({ timeNote: `Noch nicht getestet: ${missing.map((k) => checkNames[k]).join(', ')}. Lange drücken, um ohne Begegnung weiterzumachen.` });
        return;
      }
      this.change(passTime(this.campaign, how, this.deps.clock), { timeNote: undefined, combatNote: undefined, animalNote: undefined, patronNote: undefined, rumorNote: undefined, legalNote: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ timeNote: error.message });
    }
  }

  /** Ob es auf dem Aufenthaltsort im Gelände Tiere geben kann. */
  private animalsPossible(): boolean {
    const terrain = this.campaign.terrain === undefined ? undefined : terrainOf(this.campaign.terrain);
    return locationOf(this.campaign) !== undefined && terrain !== undefined && hasAnimals(terrain);
  }

  /** Setzt das Startdatum, solange der Log keinen Tag hat. */
  setStartDate(dayOfYear: number, year: number): void {
    try {
      this.change(setStartDate(this.campaign, dayOfYear, year), { timeNote: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ timeNote: error.message });
    }
  }

  /** Öffnet die Reise zur Welt auf der offenen Weltkarte; die Zahl der NSC in Low Passage (1W6) steht damit fest. */
  openJourney(): void {
    const at = this.state.world;
    if (!at) throw new DomainError('Es ist keine Weltkarte offen.');
    const to = hexId(at.column, at.row);
    const blocker = journeyBlocker(this.campaign, to);
    if (blocker) throw new DomainError(blocker);
    this.update({ journey: { to, npcDie: rollNpcLow(this.deps.random), choice: {}, guesses: {}, error: undefined, done: undefined }, world: undefined, worldError: undefined });
  }

  /** Wählt die Passage eines Reisenden. */
  choosePassage(character: string, passage: PassageId): void {
    const journey = this.state.journey;
    if (!journey || journey.done !== undefined) return;
    this.update({ journey: { ...journey, choice: { ...journey.choice, [character]: passage }, error: undefined } });
  }

  /** Der Tipp eines SC in Low Passage für die Lotterie. */
  guessSurvivors(character: string, guess: number): void {
    const journey = this.state.journey;
    if (!journey || journey.done !== undefined) return;
    this.update({ journey: { ...journey, guesses: { ...journey.guesses, [character]: guess }, error: undefined } });
  }

  /** Die Gruppe reist: Passagen, Kälteschlaf, Lotterie; danach zeigt der Dialog das Ergebnis. */
  travel(): void {
    const journey = this.state.journey;
    if (!journey || journey.done !== undefined) return;
    try {
      const view = this.current.journey;
      const choice = Object.fromEntries(travellersOf(this.campaign).map((c) => [c.id, journey.choice[c.id] ?? view?.travellers.find((t) => t.id === c.id)?.passage ?? 'middle-passage'])) as Record<string, PassageId>;
      const guesses = Object.fromEntries((view?.travellers ?? []).filter((t) => t.guess !== undefined).map((t) => [t.id, journey.guesses[t.id] ?? t.guess!]));
      const index = this.campaign.log.length;
      const after = travel(this.campaign, journey.to, choice, guesses, journey.npcDie, this.deps.random, this.deps.clock);
      this.change(after, { journey: { ...journey, choice, guesses, done: index, error: undefined }, combatNote: undefined, animalNote: undefined, patronNote: undefined, rumorNote: undefined, legalNote: undefined, timeNote: undefined, shopError: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ journey: { ...journey, error: error.message } });
    }
  }

  /** Schließt den Dialog der Reise, vorher oder nach dem Ergebnis. */
  closeJourney(): void {
    this.update({ journey: undefined });
  }

  /** Eine Notiz, oder mit `interprets` (Stelle eines Ergebnisses im Log) eine Deutung dazu. */
  writeNote(text: string, interprets?: number): void {
    this.change(appendLog(this.campaign, writeNote(this.campaign.log, text, this.deps.clock, interprets)));
  }

  /** Zieht eine Karte; die Frage schreibt man auf die offene Karte und gibt sie beim Bestätigen mit. */
  drawCard(question?: string): void {
    this.update({ card: drawCard(this.deps.random, question) });
  }

  /** Wählt im Orakelfeld der offenen Karte eine Stufe oder nimmt sie wieder heraus. */
  toggleOdds(odds: string): void {
    this.update({ card: toggleOdds(this.openCard, odds) });
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

  /** Bestätigt die Karte; `question` ist der Text im Fragefeld der Karte, falls einer übergeben wird. */
  confirmCard(question?: string): void {
    const card = question === undefined ? this.openCard : askCard(this.openCard, question);
    const pick = confirmCard(card, this.deps.clock);
    this.change(appendLog(this.campaign, pick), { card: undefined });
  }

  /** Ändert den Text der Notiz oder Deutung an der Stelle `index`. */
  editNote(index: number, text: string): void {
    this.change(editLogNote(this.campaign, index, text, this.deps.clock));
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
    // Ein angetipptes Feld des Globus oder ein gewähltes Feld des Subsektors steht an der Stelle des
    // Bereichs; ein Reiter lässt es los.
    const released = { globe: this.state.globe && { picked: undefined }, selected: undefined, worldError: this.state.globe ? this.state.worldError : undefined };
    // Der Reiter NSC zeigt beim Öffnen wieder nur die NSC des Aufenthaltsorts.
    // Ein Reiter bricht auch NSC platzieren ab.
    this.update(screen === 'npcs' && this.state.screen !== 'npcs' ? { screen, npcAll: false, npcPlacing: undefined, npcJoining: undefined, ...released } : { screen, npcPlacing: undefined, npcJoining: undefined, ...released });
  }

  /** Nimmt einen dauerhaften NSC zur nächsten Zufallsbegegnung dazu oder wieder heraus (2026-11-14g); nur Anzeige. */
  toggleJoining(id: string): void {
    const joining = this.state.joining.includes(id) ? this.state.joining.filter((j) => j !== id) : [...this.state.joining, id];
    this.update({ joining, combatNote: undefined });
  }

  /** „In Begegnung“ im Reiter NSC: wählt den NSC in der Karte Zufallsbegegnung vor und springt in den Reiter Begegnung. */
  joinEncounter(id: string): void {
    const joining = this.state.joining.includes(id) ? this.state.joining : [...this.state.joining, id];
    this.update({ joining, combatNote: undefined, screen: 'encounter' });
  }

  /** Der Modus „Wo ich war“ auf dem Globus an oder aus; nur Anzeige, nicht gespeichert. */
  toggleTrace(): void {
    this.update({ trace: !this.state.trace });
  }

  /** „Alle zeigen“ im Reiter NSC an oder aus; nur Anzeige, nicht gespeichert. */
  showAllNpcs(all: boolean): void {
    this.update({ npcAll: all });
  }

  /**
   * „Als NSC“ zum letzten Patron-Wurf (siehe domain-model.md, *Patron als NSC*): Die Erschaffung läuft
   * in der Laufbahn des Patrons durch, der neue dauerhafte NSC kommt in den Reiter NSC.
   */
  createPatronNpc(): void {
    const index = this.campaign.log.findLastIndex((e) => e.kind === 'patron');
    try {
      const { campaign, id } = createPatronNpc(this.campaign, index, this.deps.random);
      const npc = campaign.characters.find((c) => c.id === id)!;
      // Aus dem Würfelfenster heraus schließt es sich danach.
      this.change(campaign, { patronNote: `${npc.name} (${npc.background}) steht jetzt im Reiter NSC.`, encounterRoll: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      const roll = this.state.encounterRoll;
      this.update({ patronNote: error.message, ...(roll ? { encounterRoll: { ...roll, text: error.message } } : {}) });
    }
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

  /** Stellt das Ziehblatt auf eine Stufe; das Gerät merkt es sich. */
  setTrayStop(trayStop: TrayStop): void {
    if (trayStop === this.state.trayStop) return;
    this.update({ trayStop });
    this.persist(() => this.deps.repository.saveTrayStop(trayStop));
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

  /**
   * In der Charakterspalte: Eine Fertigkeit auf der Karte eines anderen Charakters antippen holt ihn
   * nach oben und beginnt die Probe mit dieser Fertigkeit, mit einem Klick. Steht er schon oben, ist
   * es dasselbe wie `chooseSkill`.
   */
  chooseSkillOf(id: string, skill: string | null): void {
    this.focusCharacter(id);
    this.chooseSkill(skill);
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
  rollEncounter(roll?: EncounterChoice, terrain?: string, force = false): void {
    try {
      // Die dazugenommenen NSC (2026-11-14g), soweit sie noch dazukommen können.
      const joined = this.state.joining.filter((id) => joinableNpcs(this.campaign).some((c) => c.id === id));
      // Erst der Test des Tages (5+ auf 1W6); wer die Art wählt oder NSC dazunimmt, überspringt ihn.
      const testing = roll === undefined && joined.length === 0 && this.campaign.location !== undefined && !currentEncounter(this.campaign);
      const tested = testing ? this.test('random', force, (note) => this.update({ combatNote: note })) : undefined;
      if (testing && !tested) return;
      const check = tested?.check;
      const base = tested ? appendLog(this.campaign, tested.entry) : this.campaign;
      if (check && !check.passed) {
        this.change(base, { combatNote: `${checkText(check)}: heute keine Begegnung.`, ...this.shown('random', check, 'Heute keine Begegnung.') });
        return;
      }
      const rolled = rollEncounter(base, this.deps.random, this.deps.clock, roll, undefined, terrain, joined);
      const prepared = rolled.encounter ? this.prepareTurn(rolled.campaign, undefined) : { campaign: rolled.campaign, simTarget: undefined };
      // Mit Test zeigt erst das Würfelfenster den Test, die Übersicht folgt danach; ohne Test gleich die Übersicht.
      const outcome = rolled.encounter ? `Wurf ${rolled.roll}: eine Begegnung!` : `Wurf ${rolled.roll}: keine Begegnung.`;
      this.change(prepared.campaign, {
        ...(rolled.encounter ? { joining: [] } : {}),
        attack: undefined,
        simTarget: prepared.simTarget,
        encounterIntro: rolled.encounter !== undefined && !check,
        combatNote: rolled.encounter ? undefined : `${check ? `${checkText(check)}, ` : ''}Wurf ${rolled.roll}: keine Begegnung.`,
        ...(check || !rolled.encounter ? this.shown('random', check, outcome, rolled.encounter !== undefined) : { encounterChoice: undefined }),
      });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ combatNote: error.message, ...this.shown('random', undefined, error.message) });
    }
  }

  /**
   * Tiere (SE 18–19, SR 47): erst der Test (5+ auf 1W6), dann 2W6 auf die Tiertabelle von Welt und
   * Gelände; sie entsteht beim ersten Wurf. Ein Ereignis kommt in den Log, ein Tier wird eine
   * Begegnung mit Übersicht. Wer die Zeile wählt, überspringt den Test.
   */
  rollAnimals(row?: number, force = false): void {
    try {
      // Erst prüfen, ob es hier Tiere geben kann; der Test zählt nur, wenn er auch gewürfelt werden kann.
      if (row === undefined && !this.animalsPossible()) {
        rollAnimalEncounter(this.campaign, this.deps.random, this.deps.clock, row);
      }
      const tested = row === undefined ? this.test('animal', force, (note) => this.update({ animalNote: note })) : undefined;
      if (row === undefined && !tested) return;
      const check = tested?.check;
      const base = tested ? appendLog(this.campaign, tested.entry) : this.campaign;
      if (check && !check.passed) {
        this.change(base, { animalNote: `${checkText(check)}: keine Tiere.`, ...this.shown('animal', check, 'Keine Tiere.') });
        return;
      }
      const rolled = rollAnimalEncounter(base, this.deps.random, this.deps.clock, row);
      const prefix = check ? `${checkText(check)}, ` : '';
      if (!rolled.encounter) {
        const event = `Wurf ${rolled.roll}: Ereignis ${animalEventOf(rolled.row.event!).name}.`;
        this.change(rolled.campaign, { animalNote: `${prefix}${event}`, ...this.shown('animal', check, event) });
        return;
      }
      const prepared = this.prepareTurn(rolled.campaign, undefined);
      const found = `Wurf ${rolled.roll}: ${animalName(rolled.row)}.`;
      this.change(prepared.campaign, { attack: undefined, simTarget: prepared.simTarget, encounterIntro: !check, animalNote: `${prefix}${found}`, combatNote: undefined, ...(check ? this.shown('animal', check, found, true) : { encounterChoice: undefined }) });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ animalNote: error.message, ...this.shown('animal', undefined, error.message) });
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

  /** Öffnet „Beute nehmen“ (NSC) bzw. „Ausweiden“ (Tier); schließt mit `undefined`. */
  openLoot(id: string | undefined): void {
    this.update({ lootOpen: id, combatNote: undefined });
  }

  /** Nimmt einem NSC alles ab, was er hat: die Gegenstände ins Gepäck, die Kredite an diesen SC. */
  takeLoot(npc: string, pc: string): void {
    this.inFight(() => this.change(takeLoot(this.campaign, npc, pc), { lootOpen: undefined }));
  }

  /** Weidet ein Tier aus; die Beute kommt ins Gepäck. Das Ergebnis rollt im Vordergrund. */
  butcher(animal: string): void {
    this.inFight(() => {
      const workers = butchers(this.campaign);
      const campaign = butcher(this.campaign, animal, this.deps.random, this.deps.clock);
      const label = (w: typeof workers.meat) => (w.name === undefined ? undefined : `${w.name.split(' ')[0]} · ${w.skill === undefined ? 'ohne Fertigkeit' : `${skillOf(w.skill).name}-${w.level}`}`);
      this.change(campaign, { lootOpen: undefined, butchered: { index: campaign.log.length - 1, meat: label(workers.meat), fur: label(workers.fur) } });
    });
  }

  closeButchered(): void {
    this.update({ butchered: undefined });
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
      const npcs = npcSideIds(encounter).filter((id) => !isDead(woundStateOf(campaign, id)));
      const keep = npcs.some((id) => id === target) ? target : npcs[0];
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
    this.change(setLocation(this.campaign, this.campaign.location?.world === id ? undefined : id));
  }

  /** Bucht Geld: Einnahme oder Ausgabe frei, Einzahlung oder Auszahlung mit einem Charakter. */
  book(kind: Exclude<BookingKind, 'purchase' | 'sale' | 'lottery' | 'rent' | 'fare'>, amount: number, text?: string, character?: string): void {
    this.inShop(() => book(this.campaign, kind, amount, this.deps.clock, text, character));
  }

  /** Verkauft auf dem Aufenthaltsort aus dem Gruppengepäck (ohne Charakter) oder was ein SC ausgerüstet hat, zu diesem Erlös je Stück. */
  sell(item: string, count: number, price: number, character: string | undefined): void {
    this.inShop(() => sell(this.campaign, item, count, price, character, this.deps.clock));
  }

  /** Verkauft so viele kg Jagdbeute aus dem Gepäck (Schlüssel des Besitzes) zum Erlös für alle zusammen. */
  sellGame(key: string, kg: number, total: number): void {
    this.inShop(() => sellGame(this.campaign, key, kg, total, this.deps.clock));
  }

  /** Kauft auf dem Aufenthaltsort aus der Gruppenkasse. Waffe und Rüstung rüstet der SC `character` gleich aus, alles andere kommt ins Gepäck. */
  buy(item: string, count: number, character: string): void {
    this.inShop(() => buy(this.campaign, item, count, character, this.deps.clock));
  }

  /**
   * Rüstet einen SC an einer Stelle aus: mit einem Stück aus dem Gepäck (Schlüssel des Besitzes) oder
   * mit dem, was ein SC an einer Stelle hat. Was dort vorher war, kommt ins Gepäck.
   */
  equip(character: string, slot: EquipSlot, source: { readonly key: string } | { readonly from: string; readonly fromSlot: EquipSlot }): void {
    this.inShop(() => equip(this.campaign, character, slot, source));
  }

  /** Legt ab, was ein SC an einer Stelle ausgerüstet hat: Es kommt ins Gepäck. */
  unequip(character: string, slot: EquipSlot): void {
    this.inShop(() => unequip(this.campaign, character, slot));
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

  /** Öffnet den Editor für einen neuen Charakter; mit `npc` als dauerhafter NSC mit dieser Rolle auf dem Aufenthaltsort. */
  newCharacter(npc = false, role?: NpcRole): void {
    this.update({ editor: { id: undefined, error: undefined, ...(npc ? { npc, ...(role ? { role } : {}) } : {}) } });
  }

  /**
   * „+ Neuer NSC“ aus einer Laufbahn (siehe domain-model.md, *NSC aus einer Laufbahn*): Die
   * Erschaffung läuft ohne Animation durch, danach steht der neue NSC im Editor zum Nachbessern.
   */
  generateNpc(service: string, role: NpcRole): void {
    try {
      const { campaign, id } = generateNpc(this.campaign, { service, role }, this.deps.random);
      this.change(campaign, { editor: { id, error: undefined } });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ editor: undefined });
    }
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
   * gewählt (unten steht dann das Vorkommen) und schließt eine offene Weltkarte; jedes erzeugte Feld
   * öffnet seine Weltkarte, fertig oder in Erschaffung. Von dort führt „Öffnen“ zum Globus.
   * Dasselbe gewählte Feld noch einmal antippen hebt die Wahl auf.
   */
  chooseHex(column: number, row: number): void {
    const hex = hexAt(this.campaign.hexes, column, row);
    // Wird für die Erschaffung gewählt, ist eine fertige Welt die Wahl.
    if (this.state.picking && isWorld(hex)) return this.chooseGenerationWorld(hexId(column, row));
    const world = hex !== undefined && !hex.empty;
    if (world) return this.update({ world: { column, row, rolls: [] }, worldError: undefined, selected: undefined });
    const same = this.state.selected?.column === column && this.state.selected.row === row;
    this.update({ selected: same ? undefined : { column, row }, world: undefined, worldError: undefined });
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
    this.update({ world: undefined, worldError: undefined, globe: undefined, npcPlacing: undefined });
  }

  /**
   * Öffnet den Globus der offenen Welt. Hat sie noch keine Oberflächenkarte, entsteht sie jetzt
   * (mit dem Bevölkerungsmultiplikator, falls er fehlt) und wird gespeichert.
   */
  openGlobe(): void {
    this.inWorld((hexes, at) => {
      const hex = hexAt(hexes, at.column, at.row);
      if (!hex || !canHaveMap(hex)) throw new DomainError('Diese Welt hat keine Oberfläche für einen Globus.');
      return { hexes: hex.map ? hexes : hexes.map((h) => (h === hex ? withSurfaceMap(h, this.deps.random, cityNamesTaken(hexes)) : h)), world: at };
    });
    if (!this.state.worldError) this.update({ globe: { picked: undefined } });
  }

  /** Öffnet Weltkarte und Globus einer fertigen Welt, z. B. des Aufenthaltsorts aus der Kopfzeile. */
  openGlobeAt(column: number, row: number): void {
    const hex = hexAt(this.campaign.hexes, column, row);
    if (!isWorld(hex)) throw new DomainError('Dort ist keine fertige Welt.');
    this.update({ world: { column, row, rolls: [] }, worldError: undefined, selected: undefined, globe: undefined });
    // Ohne Oberfläche (oder Größe 0) bleibt es bei der Weltkarte.
    if (canHaveMap(hex)) this.openGlobe();
  }

  /** Schließt den Globus; die Weltkarte bleibt offen. */
  closeGlobe(): void {
    this.update({ globe: undefined });
  }

  /** Tippt ein Oberflächenfeld auf dem Globus an (oder hebt die Wahl auf). */
  pickCell(cell: number | undefined): void {
    if (!this.state.globe) return;
    // Ein anderes Feld anzutippen bricht NSC platzieren ab.
    this.update({ globe: { picked: cell }, npcPlacing: undefined, ...(this.state.tripPlan && this.state.tripPlan.target !== cell ? { tripPlan: undefined } : {}) });
  }

  // --- Fahrt über die Oberfläche (siehe domain-model.md, *Fahrt*) ---------------------------------

  /** Sucht die Varianten einer Route zum angetippten Feld (zu Fuß, je mietbarem Fahrzeug); die schnellste ist gewählt. */
  planTrip(): void {
    const at = this.state.world;
    const target = this.state.globe?.picked;
    if (!at || target === undefined) return;
    try {
      if (this.campaign.location?.world !== hexId(at.column, at.row)) throw new DomainError('Die Gruppe ist nicht auf dieser Welt.');
      this.update({ tripPlan: { target, options: planOptions(this.campaign, target), chosen: 0, error: undefined } });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ tripPlan: { target, options: [], chosen: 0, error: error.message } });
    }
  }

  /** Wählt eine Variante der Route; der Globus zeigt sie. */
  chooseTripOption(index: number): void {
    const plan = this.state.tripPlan;
    if (!plan || index < 0 || index >= plan.options.length) return;
    this.update({ tripPlan: { ...plan, chosen: index, error: undefined } });
  }

  /** Schließt die Planung, ohne loszufahren. */
  closeTripPlan(): void {
    this.update({ tripPlan: undefined });
  }

  /** „Losfahren“: Die geplante Fahrt wird gespeichert. */
  startTrip(): void {
    const draft = this.state.tripPlan;
    const plan = draft?.options[draft.chosen];
    if (!plan) return;
    try {
      // Weiter geht es im Reiter Begegnung, der einzigen Stelle zum Weiterfahren.
      this.change(startTrip(this.campaign, plan), { tripPlan: undefined, tripNote: undefined, screen: 'encounter', globe: this.state.globe && { picked: undefined } });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ tripPlan: { ...this.state.tripPlan!, error: error.message } });
    }
  }

  /** „Einen Tag fahren“: die Fahrstunden eines Tages oder bis zur Ankunft. */
  driveDay(): void {
    try {
      // Am Boden folgt der Begegnungstest des Tages (in der Wildnis Tiere) und, wenn er besteht, die Begegnung.
      const day = travelDay(this.campaign, this.deps.random, this.deps.clock);
      const prepared = day.encounter ? this.prepareTurn(day.campaign, undefined) : { campaign: day.campaign, simTarget: undefined };
      const check = day.check;
      const animal = check?.entry.check === 'animal';
      const text = !check
        ? ''
        : !check.result.passed
          ? animal
            ? 'Heute keine Tiere.'
            : 'Heute keine Begegnung.'
          : day.event !== undefined
            ? `Wurf ${day.roll}: Ereignis ${animalEventOf(day.event).name}.`
            : day.encounter
              ? animal
                ? `Wurf ${day.roll}: Tiere!`
                : `Wurf ${day.roll}: eine Begegnung!`
              : `Wurf ${day.roll}: doch keine Begegnung.`;
      this.change(prepared.campaign, {
        tripNote: undefined,
        timeNote: undefined,
        ...(day.encounter ? { attack: undefined, simTarget: prepared.simTarget, joining: [] } : {}),
        tripRoll: check ? { kind: check.entry.check, dice: check.result.dice, target: check.result.target, passed: check.result.passed, text, encounter: day.encounter !== undefined } : undefined,
      });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ tripNote: error.message });
    }
  }

  /** Schließt den Würfeldialog des Reisetags; kam es zur Begegnung, folgt ihre Übersicht im Reiter Begegnung. */
  closeTripRoll(): void {
    const roll = this.state.tripRoll;
    if (!roll) return;
    this.update({ tripRoll: undefined });
    if (roll.encounter) {
      this.showScreen('encounter');
      this.update({ encounterIntro: true });
    }
  }

  /** Bricht die Fahrt ab; die Gruppe bleibt, wo sie ist. */
  cancelTrip(): void {
    this.change(cancelTrip(this.campaign), { tripNote: undefined });
  }

  /** Ersetzt die Oberflächenkarte der offenen Welt durch eine neu gewürfelte; gesperrt, sobald ein Ort darauf zeigt. */
  rerollMap(): void {
    this.inWorld((hexes, at) => {
      if (mapLocked(this.campaign, at.column, at.row)) throw new DomainError('Gruppe, NSC oder Logeinträge stehen auf dieser Karte; neu würfeln geht nicht mehr.');
      return { hexes: hexes.map((h) => (h.column === at.column && h.row === at.row ? withSurfaceMap(h, this.deps.random, cityNamesTaken(hexes, h)) : h)), world: at };
    });
    if (this.state.globe) this.update({ globe: { picked: undefined } });
  }

  /** Benennt eine Stadt der offenen Welt um. */
  renameCity(index: number, name: string): void {
    this.inWorld((hexes, at) => ({ hexes: renameCity(hexes, at.column, at.row, index, name), world: at }));
  }

  /** Der Ort des angetippten Feldes auf dem Globus: die erste Stadt darauf, sonst das Feld. */
  private pickedPlace(): Place {
    const at = this.state.world;
    const cell = this.state.globe?.picked;
    if (!at || cell === undefined) throw new DomainError('Erst ein Feld auf dem Globus antippen.');
    const world = hexId(at.column, at.row);
    const city = hexAt(this.campaign.hexes, at.column, at.row)?.map?.cities?.findIndex((c) => c.cell === cell) ?? -1;
    return city >= 0 ? { world, city } : { world, cell };
  }

  /** Versetzt die Gruppe auf das angetippte Feld (bzw. in die Stadt darauf); nur auf der Welt, auf der sie ist. */
  moveParty(): void {
    this.onGlobe(() => moveParty(this.campaign, this.pickedPlace()));
  }

  /** Versetzt einen dauerhaften NSC auf das angetippte Feld (bzw. in die Stadt darauf). */
  moveNpc(id: string): void {
    this.onGlobe(() => moveNpc(this.campaign, id, this.pickedPlace()));
  }

  /**
   * NSC platzieren (siehe domain-model.md, *NSC platzieren*): Der Reiter NSC öffnet sich zum Auswählen
   * für das angetippte Feld; „Alle zeigen“ holt auch NSC von anderen Welten dazu.
   */
  startNpcPlacing(): void {
    const at = this.state.world;
    const cell = this.state.globe?.picked;
    if (!at || cell === undefined) return;
    this.update({ npcPlacing: { world: hexId(at.column, at.row), cell, screen: this.state.screen }, npcJoining: undefined, screen: 'npcs', npcAll: false, globe: { picked: undefined }, worldError: undefined });
  }

  /**
   * „OK“ beim Auswählen im Reiter NSC. Beim NSC platzieren kommen die gewählten auf das Feld (bzw. in die
   * Stadt darauf), danach steht wieder das Feld da; beim NSC dazunehmen kommen sie zur Zufallsbegegnung,
   * die gleich gewürfelt wird (mit „Manuell wählen“ erst die Auswahl der Art).
   */
  placeNpcs(ids: readonly string[]): void {
    const joining = this.state.npcJoining;
    if (joining) {
      this.update({ npcJoining: undefined, screen: 'encounter', joining: ids });
      if (joining.manual) this.chooseEncounter('random');
      else this.rollEncounter();
      return;
    }
    if (!this.endNpcPlacing() || ids.length === 0) return;
    this.onGlobe(() => {
      const place = this.pickedPlace();
      return ids.reduce((campaign, id) => moveNpc(campaign, id, place), this.campaign);
    });
  }

  /** „Abbrechen“ beim Auswählen im Reiter NSC: zurück zum Feld bzw. in den Reiter Begegnung, ohne etwas zu ändern. */
  cancelNpcPlacing(): void {
    if (this.state.npcJoining) {
      this.update({ npcJoining: undefined, screen: 'encounter' });
      return;
    }
    this.endNpcPlacing();
  }

  /** Beendet NSC platzieren und tippt das Feld wieder an; ob es noch zur offenen Welt gehörte. */
  private endNpcPlacing(): boolean {
    const p = this.state.npcPlacing;
    const at = this.state.world;
    if (!p) return false;
    const open = at !== undefined && this.state.globe !== undefined && hexId(at.column, at.row) === p.world;
    this.update({ npcPlacing: undefined, screen: p.screen, ...(open ? { globe: { picked: p.cell } } : {}) });
    return open;
  }

  /** Führt eine Änderung auf dem Globus aus; verletzt sie eine Regel, steht das auf der Weltkarte. */
  private onGlobe(step: () => Campaign): void {
    try {
      this.change(step(), { worldError: undefined });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ worldError: error.message });
    }
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
    // Jede Änderung am gespeicherten Stand setzt die Änderungszeit; daran merkt der Abgleich, dass hier etwas neu ist.
    campaign = touched(stampPlaces(this.state.campaign?.log, stampDays(this.state.campaign?.log, campaign)), this.deps.clock);
    const campaigns = this.state.campaigns.map((c) => (c.id === campaign.id ? campaign : c));
    this.update({ ...rest, campaigns, campaign });
    this.persist(() => this.deps.repository.save(campaign), true);
    this.requestSync();
  }

  /**
   * Die Grundkarte beim Öffnen einer Kampagne: der Globus des Aufenthaltsorts, wenn seine
   * Oberflächenkarte schon entstanden ist, sonst der Subsektor (dort entsteht sie beim ersten Antippen).
   */
  private home(campaign: Campaign): Pick<ControllerState, 'world' | 'globe'> {
    const at = campaign.location?.world;
    const hex = at === undefined ? undefined : campaign.hexes.find((h) => hexId(h.column, h.row) === at);
    if (!hex || !isWorld(hex) || !hex.map) return { world: undefined, globe: undefined };
    return { world: { column: hex.column, row: hex.row, rolls: [] }, globe: { picked: undefined } };
  }

  /** Läuft eine Fahrt, öffnet die Kampagne im Reiter Begegnung, wo es weitergeht. */
  private landing(campaign: Campaign): Pick<ControllerState, 'screen'> | Record<string, never> {
    return campaign.trip ? { screen: 'encounter' } : {};
  }

  /** Alle Entwürfe zu, die Grundkarte wie beim Öffnen der Kampagne. */
  private closed(campaign: Campaign): Partial<ControllerState> {
    return { ...closedDrafts, ...this.home(campaign) };
  }

  /** Nimmt eine neue Kampagne auf, öffnet und speichert sie. */
  private addCampaign(campaign: Campaign): void {
    this.update({ ...this.closed(campaign), campaigns: [...this.state.campaigns, campaign], campaign, campaignSheet: undefined });
    this.persist(() => this.deps.repository.save(campaign), true);
    this.persist(() => this.deps.repository.saveOpen(campaign.id));
    this.requestSync();
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
