import {
  addCharacter,
  appendLog,
  askOracle,
  createCampaign,
  DomainError,
  removeCharacter,
  restoreCharacter,
  rollDice,
  setOdds,
  updateCharacter,
  type Campaign,
  type CampaignRepository,
  type CharacterInput,
  type Characteristic,
  type Clock,
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

export interface GameDependencies {
  readonly repository: CampaignRepository;
  readonly random: Random;
  readonly clock: Clock;
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
      campaign: undefined,
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

  /** Lädt die Kampagne; gibt es noch keine, beginnt eine neue mit den Beispielcharakteren. */
  async init(): Promise<void> {
    let campaign: Campaign | undefined;
    try {
      campaign = await this.deps.repository.load();
    } catch (error) {
      this.update({ storageError: `Der Spielstand ließ sich nicht laden: ${String(error)}` });
    }
    if (campaign) this.update({ campaign });
    else this.change(createCampaign());
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
        // Die Fertigkeit der Probe kann weg sein: Die Probe für diesen Charakter beginnt neu.
        const task = this.state.task?.for === id ? startTask(campaign, id) : this.state.task;
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

  /** Ändert den Spielstand und speichert ihn. */
  private change(campaign: Campaign, rest: Partial<ControllerState> = {}): void {
    this.update({ ...rest, campaign });
    this.saving = this.saving.then(() =>
      this.deps.repository.save(campaign).then(
        () => {
          if (this.state.storageError) this.update({ storageError: undefined });
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
