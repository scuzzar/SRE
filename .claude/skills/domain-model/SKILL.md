---
name: domain-model
description: Gemeinsam mit dem Owner ein Domänenmodell (Domain-Driven Design) als PlantUML-Klassendiagramm erstellen, ändern, prüfen und freigeben – mit Diagramm, Regeltext, Glossar und offenen Fragen, nach dem Grundsatz „das Diagramm führt, der Code folgt“. Benutze diesen Skill immer, wenn jemand ein Domänenmodell, Klassendiagramm oder Datenmodell anlegen, besprechen oder ändern will, wenn ein Projekt domänengetrieben gebaut werden soll, wenn es um docs/domain-model.md oder domain-model.puml geht, oder wenn eine Code-Änderung das Modell berührt (neue Klasse, neues Feld, neue Beziehung) – auch wenn das Wort „Skill“ oder „DDD“ nicht fällt.
---

# Domänenmodell gemeinsam bauen

Das Domänenmodell ist der Vertrag zwischen Owner und Claude: Es legt fest, welche Dinge es in der
Anwendung gibt, wie sie zusammenhängen und was gespeichert wird. Es entsteht im Gespräch, Schritt für
Schritt, und der Owner entscheidet. Claude zeichnet, zeigt Folgen auf und hält alles widerspruchsfrei.

## Die Grundsätze

1. **Das Diagramm führt, der Code folgt.** Änderungen gehen erst ins Diagramm, werden abgestimmt und
   dann in den Code übertragen. Das Diagramm wird nie umgezeichnet, damit es zum Code passt. Wo der
   Code noch nicht folgt, steht das im Abschnitt „Wo der Code noch nicht folgt“, bis es behoben ist.
   Warum: Sonst wird das Modell zur Beschreibung des Zufallsstands statt zur gemeinsamen Absicht.
2. **Nur Daten und Beziehungen, keine Operationen.** Abgeleitete Werte bekommen ein `/`
   (`/total`, `/success`). Wie etwas berechnet wird, steht im Regeltext, nicht im Bild.
3. **Das Diagramm zeigt den gespeicherten Stand** und die Referenzdaten, auf die er verweist.
   Flüchtiges kommt nur hinein, wenn sich ein Ablauf sonst nicht abbilden lässt – typisch: etwas,
   das zwischen zwei Benutzereingaben bestehen muss (eine gezogene Karte, eine Probe in
   Vorbereitung). Reine Anzeige (offener Screen, Reiter, Scrollposition) gehört nie hinein.
4. **Pfeile zeigen in eine Richtung.** Aus dem Spielstand in die Referenzdaten, nie zurück. Aus
   Flüchtigem in den gespeicherten Stand, nie zurück („der gespeicherte Stand weiß nichts von seinen
   Entwürfen“). So bleiben die Teile getrennt importierbar und speicherbar.
5. **Verlauf verweist, statt zu kopieren – hält aber fest, was das Ergebnis entschieden hat.** Ein
   Logeintrag verweist auf Charakter, Stufe, Eintrag usw. Die Zahlen, die damals über das Ergebnis
   entschieden haben (Chance, DM, Zielwert), speichert er selbst; sonst ändert eine spätere Änderung
   rückwirkend alte Ergebnisse. Worauf der Verlauf verweist, wird nie gelöscht: Es bekommt ein
   `retired`-Feld und wird ausgeblendet.
6. **Keine doppelten Verweise.** Folgt ein Verweis aus einem anderen (der Eintrag gehört zu genau
   einem Feld), wird er als abgeleitet (`/in`) markiert oder weggelassen.
7. **Bezeichner im Code englisch, Gespräch und Doku in der Sprache des Owners.** Die Tabelle
   „Begriffe“ ist die Brücke. Neue Begriffe kommen zuerst dorthin.

## Farben und was sie bedeuten

| Farbe | Stereotyp | Bedeutung |
|---|---|---|
| Blau `#e8ecfb` / `#5b64b8` | (keiner) | Spielstand bzw. Anwendungsstand, wird gespeichert |
| Grau `#f4f4f4`, gestrichelt | `<<transient>>` | Flüchtig: zwischen zwei Eingaben da, nie gespeichert |
| Grün `#e6f4e6` / `#4f9a4f` | `<<reference>>` | Referenzdaten: feste Tabellen, in jeder Instanz gleich, als Daten im Repo |
| Weiß | `<<value>>` | Werte und Wertelisten ohne eigene Identität (Enums, Wertobjekte) |
| Orange `#fdf1dc` / `#b8862e` | `<<browser>>` | Optional: vom Gerät über Spiele hinweg gehalten, nicht im Spielstand (z. B. Bestenliste) |

Die Farben ersetzen Pakete im Bild: Flüchtiges liegt im Code in einem eigenen Paket (z. B.
`model/draft/`), das Diagramm zeigt das nur durch die Farbe. Nicht benutzte Farben aus Legende und
Skinparams entfernen.

## Die Dateien

| Datei | Inhalt |
|---|---|
| `docs/domain-model.puml` | Quelle des Diagramms. Vorlage: `assets/domain-model.puml` |
| `docs/domain-model.png` | Gerendertes Bild, wird mit eingecheckt |
| `docs/domain-model.md` | Status, Bild, Farblegende, Begriffe, Regeln, die das Bild nicht zeigt, offene Fragen, „Wo der Code noch nicht folgt“. Vorlage: `assets/domain-model.md` |
| `CLAUDE.md` | Die Regel „das Modell führt“. Baustein: `assets/claude-md-snippet.md` |

Gibt es schon eine `ARCHITECTURE.md`, verweist sie auf das Modell und sagt, in welchem Ordner
gespeicherter Stand, Flüchtiges und Referenzdaten liegen.

## Rendern und zeigen

```bash
bash .claude/skills/domain-model/scripts/render.sh docs/domain-model.puml
```

Das Skript lädt bei Bedarf PlantUML von Maven Central nach `~/.cache/plantuml/` und braucht nur
Java; `!pragma layout smetana` macht Graphviz überflüssig. Nach jedem Rendern:

1. Das PNG mit dem Read-Werkzeug ansehen: Sind Beschriftungen lesbar, überlappt etwas, stimmt die
   Legende?
2. Das Bild dem Owner zeigen (`SendUserFile` mit `display: "render"`, sonst Pfad nennen). Der Owner
   denkt im Bild, nicht im PlantUML-Text.

## Ablauf

### 1. Erster Entwurf

- Anforderungen lesen (README, UI-Entwurf, bestehender Code). Gibt der Owner ein Vorbildprojekt an,
  dessen `domain-model.md` und `CLAUDE.md` lesen und Aufbau und Ton übernehmen.
- Klein anfangen: nur was die erste Version speichert. Lieber eine Klasse zu wenig als eine
  Hilfsklasse, die nur der Bequemlichkeit des Codes dient.
- Alle Dateien anlegen, rendern, zeigen. Status „Entwurf, noch nicht abgestimmt“. Offene Fragen
  ehrlich auflisten, jede mit dem, was davon abhängt.

### 2. Änderungen im Gespräch

- **Vorschläge des Owners genau so umsetzen, wie gesagt** – dann die Folgen nennen, die er vielleicht
  nicht sieht (Verweise ins Leere, rückwirkend geänderte Ergebnisse, verlorene Eindeutigkeit, eine
  Regel, die nun nicht mehr gilt). Folgen, die eine Entscheidung brauchen, werden offene Fragen;
  nicht still „verbessern“.
- **Bei Gegenvorschlägen erklären, mit Beispiel.** „Lernt Kira später Pilot-3, wird eine alte
  gescheiterte Probe im Log zum Erfolg“ überzeugt mehr als „Verweise sind instabil“.
- **Eine Empfehlung geben**, nicht nur Optionen aufzählen.
- Je Änderung: `.puml` ändern → rendern → ansehen → `domain-model.md` nachziehen (Regeln, Begriffe,
  offene Fragen) → `ARCHITECTURE.md` prüfen → committen → Bild zeigen → in wenigen Sätzen sagen, was
  sich geändert hat und was jetzt offen ist.
- Wenn Unklarheit herrscht, was eine Farbe oder ein Bereich bedeutet: am konkreten Ablauf erklären
  (was passiert beim Ziehen, Antippen, Bestätigen; was überlebt einen Neustart).

### 3. Gesamtprüfung

Vor dem Abarbeiten der offenen Fragen und vor der Freigabe alles gegeneinander lesen:

- Stimmt jede Klasse, jedes Feld und jeder Pfeil im `.puml` mit Regeltext und Begriffen überein?
- Gibt es Reste alter Begriffe (`grep` nach entfernten Klassennamen)?
- Widersprechen sich README, Modell und Architektur (z. B. „Daten können angepasst werden“ gegen
  „Ergebnis wird aus den heutigen Daten gerechnet“)?
- Doppelte Regeln zusammenführen, kaputte Zeilenumbrüche nach Skript-Edits reparieren.

Echte Widersprüche, die das Modell ändern, werden offene Fragen; reine Ungenauigkeiten direkt
beheben und im Bericht auflisten.

### 4. Offene Fragen klären

Auf Wunsch Punkt für Punkt mit `AskUserQuestion`: eine Frage je Aufruf, 2–3 Optionen, die
empfohlene zuerst mit „(Recommended)“, jede Option mit ihrer Folge fürs Modell. Antwortet der Owner
mit einer Rückfrage („können wir das schon abbilden?“), erst prüfen und erklären, dann die
Folgefragen stellen. Danach alle Antworten in einem Zug einarbeiten, den Abschnitt „Offene Fragen“
entfernen und Status „wartet auf Freigabe“ setzen.

### 5. Freigabe

Erst auf ausdrückliches „freigegeben“ des Owners: Status in `domain-model.md` auf „Freigegeben für
Version N (Datum)“, „Entwurf“ aus dem Diagrammtitel nehmen, README und `ARCHITECTURE.md` nachziehen,
committen und – wenn der Owner es sagt – nach `main` mergen. Ab jetzt gilt Grundsatz 1 für jede
Änderung.

## Kleinigkeiten, die Zeit sparen

- Mehrere Textstellen per Skript ersetzen, aber jede Ersetzung mit `assert s.count(alt) == 1`
  absichern; sonst trifft man die falsche Stelle oder gar keine.
- Commit-Autor nach der Regel in `CLAUDE.md` setzen (z. B. per `git -c user.name=… -c
  user.email=… commit`), falls der Owner das festgelegt hat.
- Kleine, beschreibende Commits je Modelländerung; der Verlauf erzählt dann, wie das Modell
  entstanden ist.
