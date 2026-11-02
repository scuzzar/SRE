import { useState, useSyncExternalStore } from 'react';
import { testHaptic, vibrationKind } from './haptics';
import { ExternalIcon } from './icons';
import { canPromptInstall, installKind, promptInstall, subscribeInstall } from './install';

const repository = 'https://github.com/scuzzar/SRE';

/** Quellenangaben und Hinweise, wie sie die README für Version 1 verlangt, dazu die Links zum Projekt. */
export function AboutScreen({ persistent, durable }: { persistent: boolean; durable: boolean | undefined }) {
  return (
    <div className="screen">
      <section className="scroll about" aria-labelledby="about-title">
        <h2 id="about-title" className="section-title">
          Über
        </h2>
        <div>
          <h2>Solo RPG Engine</h2>
          <p>Eine App für Solo-Rollenspiel mit Classic Traveller: ein Ja/Nein-Orakel, eine Inspirationskarte und Proben für den Charakter oben, alles auf einem Bildschirm.</p>
          <p className="muted">
            {persistent
              ? ['Der Spielstand liegt nur auf diesem Gerät, im Speicher des Browsers.', durable === undefined ? '' : durableText[durable ? 'yes' : 'no']].join(' ').trim()
              : 'Hier lässt sich nichts dauerhaft speichern: Der Spielstand geht beim Schließen verloren.'}
          </p>
        </div>
        <Install />
        <Vibration />
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
            . Aktion und Beschreibung des Zufallsereignisses, Hören und Riechen bei den Sinneseindrücken und die Themen-Tafeln stammen
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

/** Ob der Browser zugesagt hat, den Spielstand nicht zu löschen; ohne Antwort steht nichts da. */
const durableText = {
  yes: 'Der Browser hält ihn dauerhaft und löscht ihn nicht, auch wenn der Platz knapp wird.',
  no:
    'Der Browser hat nicht zugesagt, ihn dauerhaft zu halten: Wird der Platz knapp oder bleibt die App lange unbenutzt, kann er ihn löschen. Installieren hilft; sicher ist ein Export.',
} as const;

const exportTip = 'Kampagnen nimmt man über Export und Import in der Kampagnenwahl mit.';

const installTexts = {
  installed: ['Die App ist installiert und startet auch ohne Netz.'],
  'installed-ios': [
    'Die App ist installiert und startet auch ohne Netz.',
    `Auf dem iPhone hat die installierte App ihren eigenen Speicher, getrennt von Safari. Wer das Icon löscht, löscht auch die Kampagnen: vorher exportieren. ${exportTip}`,
  ],
  ios: [
    'Im Browser auf den Teilen-Knopf tippen, dann „Zum Home-Bildschirm“. Danach startet die App vom Home-Bildschirm, auch ohne Netz.',
    `Die installierte App hat ihren eigenen Speicher, getrennt von diesem Browser. ${exportTip}`,
  ],
  browser: ['Im Menü des Browsers „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen. Danach startet die App wie jede andere, auch ohne Netz.'],
  file: ['Als lokal geöffnete Datei lässt sich die App nicht installieren. Das geht über ihre Adresse im Netz (GitHub Pages).'],
} as const;

/** Wie man die App auf diesem Gerät installiert; wo der Browser es erlaubt, mit eigenem Knopf. */
function Install() {
  const offered = useSyncExternalStore(subscribeInstall, canPromptInstall);
  const kind = installKind();
  return (
    <div>
      <h2>Installieren</h2>
      {offered ? (
        <>
          <p>Installiert startet die App wie jede andere, auch ohne Netz.</p>
          <button type="button" className="ghost" onClick={() => void promptInstall()}>
            App installieren
          </button>
        </>
      ) : (
        installTexts[kind].map((text) => <p key={text}>{text}</p>)
      )}
    </div>
  );
}

const kinds = {
  api: 'Dieser Browser kann vibrieren (Vibrations-API).',
  switch: 'Dieser Browser kennt keine Vibrations-API; die App nutzt den kurzen Ruck des iPhones (ab iOS 18).',
  firefox: 'Firefox lässt Webseiten nicht vibrieren, auch wenn das Gerät es kann. In Chrome, Samsung Internet oder Edge vibrieren Würfel und Karte.',
  none: 'Dieser Browser kann nicht vibrieren.',
} as const;

/** Zum Ausprobieren, ob Würfel und Karte hier vibrieren können. Das Ergebnis ist reine Anzeige. */
function Vibration() {
  const [answer, setAnswer] = useState<string | undefined>(undefined);
  const kind = vibrationKind();
  return (
    <div>
      <h2>Vibration</h2>
      <p>{kinds[kind]}</p>
      {kind !== 'firefox' && kind !== 'none' && (
        <button
          type="button"
          className="ghost"
          onClick={() =>
            setAnswer(
              testHaptic()
                ? 'Gesendet. Spürst du nichts, ist die Vibration im System aus, unter Android etwa in den Einstellungen unter „Töne und Vibration“ bzw. „Vibration und Haptik“, oder ein Energiesparmodus hält sie an.'
                : 'Der Browser hat die Vibration abgelehnt.',
            )
          }
        >
          Vibration testen
        </button>
      )}
      {answer && (
        <p className="muted" role="status" style={{ marginTop: 8 }}>
          {answer}
        </p>
      )}
    </div>
  );
}
