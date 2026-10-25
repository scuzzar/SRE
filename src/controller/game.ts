import {
  addCharacter,
  appendLog,
  askOracle,
  characterOf,
  byName,
  campaignFileName,
  createCampaign,
  DomainError,
  fromCampaignFile,
  nextCampaignId,
  removeCampaign,
  removeCharacter,
  removeLogEntry,
  renameCampaign,
  restoreCharacter,
  rollDice,
  setOdds,
  toCampaignFile,
  updateCharacter,
  type Campaign,
  type CampaignId,
  type CampaignRepository,
  type CharacterInput,
  type Characteristic,
  type Clock,
  type Download,
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
} from '../model/draft';
import { buildSnapshot, type ControllerState, type Screen, type Snapshot } from './snapshot';

/** Was beim Wechsel der Kampagne verfällt: Entwürfe und alles, was an ihnen hängt. */
const closedDrafts = { card: undefined, task: undefined, details: false, result: undefined, editor: undefined } as const;

export interface GameDependencies {
  readonly repository: CampaignRepository;
  readonly random: Random;
  readonly clock: Clock;
  readonly download: Download;
  /** Ob der Speicher das Schließen der App übersteht. */
  readonly persistent?: boolean;
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

  constructor(private readonly deps: GameDependencies) {
    this.state = {
      campaigns: [],
      campaign: undefined,
      campaignSheet: undefined,
      persistent: deps.persistent ?? true,
      storageError: undefined,
      screen: 'oracle',
      card: undefined,
      task: undefined,
      details: false,
      result: undefined,
      editor: undefined,
    };
    this.current = buildSnapshot(this.state);
  }

  /**
   * Lädt die Kampagnen und öffnet die, die zuletzt offen war. Gibt es noch keine, beginnt die erste
   * mit den Beispielcharakteren.
   */
  async init(): Promise<void> {
    let campaigns: readonly Campaign[] = [];
    let open: CampaignId | undefined;
    try {
      campaigns = await this.deps.repository.list();
      open = await this.deps.repository.loadOpen();
    } catch (error) {
      this.update({ storageError: `Der Spielstand ließ sich nicht laden: ${String(error)}` });
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

  /** Löscht einen Logeintrag endgültig. */
  deleteLogEntry(index: number): void {
    this.change(removeLogEntry(this.campaign, index), { result: undefined });
  }

  // --- Charakter-Screen und Proben -------------------------------------------------------------

  showScreen(screen: Screen): void {
    this.update({ screen });
  }

  /**
   * Wählt den Charakter für eine Probe und klappt seine Details auf. Ein anderer Charakter beginnt
   * eine neue Probe. Derselbe klappt auf, wenn er noch zu ist, sonst wieder zu und beendet die Probe.
   */
  chooseCharacter(id: string): void {
    if (this.state.task?.for !== id) this.update({ task: startTask(this.campaign, id), details: true });
    else if (!this.state.details) this.update({ details: true });
    else this.update({ task: undefined, details: false });
  }

  /**
   * Wählt die Fertigkeit eines Charakters für die Probe; `null` heißt „ohne Fertigkeit“. Gilt die
   * Probe noch keinem oder einem anderen Charakter, beginnt sie mit dieser Wahl neu, ohne die
   * Details aufzuklappen.
   */
  chooseSkill(id: string, skill: string | null): void {
    if (this.state.task?.for === id) this.update({ task: chooseSkill(this.state.task, this.campaign, skill) });
    else this.update({ task: chooseSkill(startTask(this.campaign, id), this.campaign, skill), details: false });
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

  /** „Weiter“: schließt das Ergebnis und bleibt im Charakter-Screen; die Probe bleibt vorbereitet. */
  closeResult(): void {
    this.update({ result: undefined });
  }

  /** „Zum Orakel“: schließt das Ergebnis und geht zum Orakel, wo der Log steht. */
  closeResultToOracle(): void {
    this.update({ result: undefined, task: undefined, screen: 'oracle' });
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
        const campaign = updateCharacter(this.campaign, id, input);
        // Die Fertigkeit der Probe kann weg sein: Die Probe für diesen Charakter beginnt neu. Ist er
        // jetzt tot, endet sie.
        const own = this.state.task?.for === id;
        const task = !own ? this.state.task : characterOf(campaign, id).dead ? undefined : startTask(campaign, id);
        this.change(campaign, { editor: undefined, task });
      }
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.update({ editor: { ...editor, error: error.message } });
    }
  }

  /** Entfernt den Charakter: gelöscht, wenn der Log nicht auf ihn verweist, sonst ausgeblendet. */
  removeCharacter(id: string): void {
    const task = this.state.task?.for === id ? undefined : this.state.task;
    this.change(removeCharacter(this.campaign, id), { editor: undefined, task });
  }

  restoreCharacter(id: string): void {
    this.change(restoreCharacter(this.campaign, id));
  }

  // --- intern ----------------------------------------------------------------------------------

  private get campaign(): Campaign {
    if (!this.state.campaign) throw new Error('Die Kampagne ist noch nicht geladen.');
    return this.state.campaign;
  }

  private get openCard() {
    if (!this.state.card) throw new DomainError('Es ist keine Karte offen.');
    return this.state.card;
  }

  private get openTask() {
    if (!this.state.task) throw new DomainError('Es wird keine Probe vorbereitet.');
    return this.state.task;
  }

  /** Ändert die offene Kampagne und speichert sie. */
  private change(campaign: Campaign, rest: Partial<ControllerState> = {}): void {
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
