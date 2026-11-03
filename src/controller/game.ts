import {
  addCharacter,
  appendLog,
  askOracle,
  byName,
  campaignFileName,
  createCampaign,
  DomainError,
  focusOf,
  fromCampaignFile,
  nextCampaignId,
  removeCampaign,
  removeCharacter,
  removeLogEntry,
  renameCampaign,
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
  type Random,
} from '../model';
import {
  chooseSkill,
  confirmCard,
  drawCard,
  redrawCard,
  rollTask,
  startTask,
  toggleCharacteristic,
  togglePick,
  rollOccurrence,
  rollSurfaceAt,
  rollWorld,
  runWorld,
} from '../model/draft';
import { buildSnapshot, type ControllerState, type OpenWorld, type Screen, type Snapshot } from './snapshot';

/** Was beim Wechsel der Kampagne verfällt: Entwürfe und alles, was an ihnen hängt. */
const closedDrafts = { card: undefined, task: undefined, opened: undefined, result: undefined, editor: undefined, generating: false, generationError: undefined, world: undefined, worldError: undefined, selected: undefined, picking: false } as const;

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
      task: undefined,
      opened: undefined,
      stripCollapsed: false,
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
    const campaign = campaigns.find((c) => c.id === open) ?? byName(campaigns)[0];
    if (campaign) this.update({ campaigns, campaign });
    else this.addCampaign(createCampaign());
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
    this.change(removeLogEntry(this.campaign, index), { result: undefined });
  }

  // --- Charakter oben und Proben ---------------------------------------------------------------

  showScreen(screen: Screen): void {
    this.update({ screen });
  }

  /** Wischen: Ein anderer Charakter steht oben; eine vorbereitete Probe endet. */
  focusCharacter(id: string): void {
    if (focusOf(this.campaign)?.id === id) return;
    this.change(setFocus(this.campaign, id), { task: undefined });
  }

  /** Klappt die Leiste mit dem Charakter oben ein oder auf; das Gerät merkt es sich. */
  toggleStrip(): void {
    const stripCollapsed = !this.state.stripCollapsed;
    this.update({ stripCollapsed });
    this.persist(() => this.deps.repository.saveStripCollapsed(stripCollapsed));
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
        const task = focusOf(this.campaign)?.id === id ? undefined : this.state.task;
        this.change(updateCharacter(this.campaign, id, input), { editor: undefined, task });
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

  /** Ändert die offene Kampagne und speichert sie. Steht danach ein anderer Charakter oben, endet die Probe. */
  private change(campaign: Campaign, rest: Partial<ControllerState> = {}): void {
    if (this.state.campaign && focusOf(this.state.campaign)?.id !== focusOf(campaign)?.id) rest = { ...rest, task: undefined };
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
