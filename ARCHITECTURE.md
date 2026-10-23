# Architektur

> **Stand: Entwurf.** Es gibt noch keinen Code. Dieses Dokument legt fest, wie er gebaut wird.

Die App ist eine Progressive Web App in **TypeScript** (Vite, React, Dexie für IndexedDB, Zod für
die Referenzdaten, Vitest und Playwright für Tests). Sie folgt **strikt MVC**: Model, View und
Controller sind getrennte Schichten mit festen Regeln, wer wen kennen darf.

Was das Model enthält, legt das [Domänenmodell](docs/domain-model.md) fest. Es führt; dieses Dokument
sagt nur, wo die Teile liegen und wie sie miteinander reden.

## Die vier Regeln

**1. Imports zeigen nur nach unten.** Jede Schicht darf nur aus den Schichten unter ihr importieren:

| # | Ordner | Schicht | Darf importieren aus |
|--:|---|---|---|
| 0 | `src/data/` | Referenzdaten: Tabellen als JSON, Schemas | — |
| 1 | `src/model/` | **Model**: die Klassen des Domänenmodells und ihre Regeln | `data` |
| 2 | `src/storage/` | Speicher: Dexie, liest und schreibt die Kampagne | `model` |
| 3 | `src/controller/` | **Controller**: eine Methode pro Absicht des Spielers | `model` |
| 4 | `src/view/` | **View**: React-Komponenten | `controller`, `model` (nur Typen) |
| 5 | `src/main.tsx` | Verdrahtung | alles |

Speicher und Controller kennen sich nicht. Der Controller bekommt den Speicher als Schnittstelle
(`CampaignRepository`, im Model definiert), `main.tsx` reicht die Dexie-Umsetzung hinein.

**2. Der Controller nimmt jede Eingabe an.** Die View ruft für jede Eingabe genau eine
Controller-Methode auf. Der Controller entscheidet, was daraus folgt:

- **Er ändert das Model**, als Einziger, und speichert über das Repository: `askOracle(question)`,
  `rollDice()`, `drawCard(question)`, `togglePick(entry)`, `confirmCard()`, `discardCard()`,
  `setOdds(odds)`, `chooseCharacter(c)`, `chooseSkill(skill)`, `toggleCharacteristic(c)`,
  `rollTask()`. Offene Karte und Probe in Vorbereitung sind Teil des Models, werden aber nicht
  gespeichert.
- **Er wählt, welche View zu sehen ist**: Orakel- oder Charakter-Screen (`showScreen(screen)`), die
  Inspirationskarte im Vordergrund, das Ergebnis-Popup. Auch der Ablauf ist seine Sache, etwa „nach
  dem Schließen des Ergebnisses zurück zum Orakel“ (`closeResult()`).

Die View sieht das Model nur lesend (`Readonly`-Typen); ein Schreibzugriff aus der View ist ein
Compilerfehler.

**3. Nach oben wird gemeldet, nicht gerufen.** Der Controller kennt keine Komponenten. Er wählt die
View, indem er seinen Zustand ändert, nicht indem er Komponenten aufruft. Er bietet
`subscribe(listener)` und `snapshot()` an: den Spielstand aus dem Model und seinen eigenen Zustand
(welcher Screen, ob das Popup offen ist). Die View hängt sich mit `useSyncExternalStore` daran
und zeichnet neu, wenn sich etwas ändert. Das ist die einzige Verbindung von unten nach oben.

**4. Das Model ist frei von Seiteneffekten, die View frei von Regeln und Ablauf.**
- Das Model kennt kein DOM, keinen Speicher, kein `Math.random()` und kein `Date.now()`. Zufall und
  Uhr kommen als Schnittstellen herein (`Random`, `Clock`). So sind Tests deterministisch, und
  physische Würfel (später) sind nur eine weitere Zufallsquelle.
- Die View rechnet nichts aus, was eine Regel ist, und entscheidet nichts über den Ablauf. Welche
  Attribute wählbar sind, welcher DM gilt, was auf 2W6 nötig ist und wie wahrscheinlich das ist,
  liefert das Model über den Snapshot des Controllers. Die View hält nur, was reine Darstellung ist:
  den gewählten Themen-Reiter, den Text im Fragefeld während des Tippens, die Scrollposition.
  Faustregel: Braucht der Controller es für eine Entscheidung, gehört es dem Controller.

## Wie die Regeln geprüft werden

- **Imports:** eine ESLint-Regel (`import/no-restricted-paths`) mit einer Zone pro Zeile der Tabelle.
  Ein Import nach oben bricht `npm run lint`.
- **Schreibzugriffe:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` und
  `Readonly`-Typen für alles, was der Controller der View gibt.
- **Regeln und Ablauf:** Unit-Tests mit Vitest für Model und Controller, darunter die Beispiele aus
  der README (Kira, Jonas). Weil der Controller den Ablauf hält, lässt sich auch „Probe würfeln →
  Popup → zurück zum Orakel“ ohne Browser testen. Playwright prüft die Oberfläche bei 390 × 844.
