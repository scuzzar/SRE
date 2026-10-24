import { ExternalIcon } from './icons';

const repository = 'https://github.com/scuzzar/SRE';

/** Quellenangaben und Hinweise, wie sie die README für Version 1 verlangt, dazu die Links zum Projekt. */
export function AboutScreen({ persistent }: { persistent: boolean }) {
  return (
    <div className="screen">
      <section className="scroll about" aria-labelledby="about-title">
        <h2 id="about-title" className="section-title">
          Über
        </h2>
        <div>
          <h2>Solo RPG Engine</h2>
          <p>Eine App für Solo-Rollenspiel mit Classic Traveller: ein Ja/Nein-Orakel, eine Inspirationskarte und Proben direkt im Charakter-Screen.</p>
          <p className="muted">
            {persistent
              ? 'Der Spielstand liegt nur auf diesem Gerät, im Speicher des Browsers.'
              : 'Hier lässt sich nichts dauerhaft speichern: Der Spielstand geht beim Schließen verloren.'}
          </p>
        </div>
        <ul className="links" aria-label="Projekt">
          <li>
            <a href={repository} target="_blank" rel="noreferrer">
              <span>Quellcode auf GitHub</span>
              <ExternalIcon />
            </a>
          </li>
          <li>
            <a href={`${repository}/issues/new`} target="_blank" rel="noreferrer">
              <span>Fehler melden oder Idee vorschlagen</span>
              <ExternalIcon />
            </a>
          </li>
        </ul>
        <div>
          <h2>Classic Traveller</h2>
          <p>
            Traveller ist ein Markenzeichen von Far Future Enterprises. Copyright © 1977–2026 Far Future Enterprises. Dieses Projekt nutzt die
            Mechanik nach der Fan-Policy von Far Future Enterprises; es ist inoffiziell und kostenlos.
          </p>
        </div>
        <div>
          <h2>Game Master&apos;s Apprentice</h2>
          <p>
            Der Aufbau der Inspirationskarte folgt dem GameMaster&apos;s Apprentice, Second Edition, von Larcenous Designs, LLC. Die Einträge stammen
            nicht aus dem GMA-Deck; ältere Einträge im Log sind eigene Inhalte mit Traveller-Bezug. Vorbild für die Bedienung ist die Web-Umsetzung von{' '}
            <a href="https://jamesturneronline.net/game-masters-apprentice/" target="_blank" rel="noreferrer">
              James Turner
            </a>
            .
          </p>
        </div>
        <div>
          <h2>Mythic</h2>
          <p>
            Das Orakel ist angelehnt an den Mythic Game Master Emulator, Second Edition, von Tana Pigeon,{' '}
            <a href="https://wordmillgames.com" target="_blank" rel="noreferrer">
              Word Mill Games
            </a>
            . Aktion und Beschreibung des Zufallsereignisses, Hören und Riechen bei den Sinneseindrücken und die Themen-Reiter stammen
            aus seinen Bedeutungstabellen (Actions, Descriptions und Elements), ins Deutsche übersetzt und in der Schreibweise angepasst. Diese Inhalte stehen unter der Lizenz{' '}
            <a href="https://wordmillgames.com/license.html" target="_blank" rel="noreferrer">
              CC BY-NC
            </a>
            . Kein offizielles Produkt von Word Mill Games.
          </p>
        </div>
        <p className="muted">Ein inoffizielles Fan-Projekt, kostenlos angeboten.</p>
      </section>
    </div>
  );
}
