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
| `AGENTS.md` | Die Regel „das Modell führt“. Baustein: `assets/claude-md-snippet.md` |
| `docs/model-views.json` | Die Bereiche (`views`) und die Änderungen (`changes`) für die Ausschnitte |
| `docs/views/*.puml`, `.png` | Je Bereich ein Ausschnitt, erzeugt, nie von Hand ändern |
| `docs/changes/*.puml`, `.png` | Je Änderung ein Ausschnitt mit roter Markierung; nach der Freigabe der Nachweis |

Gibt es schon eine `ARCHITECTURE.md`, verweist sie auf das Modell und sagt, in welchem Ordner
gespeicherter Stand, Flüchtiges und Referenzdaten liegen.

## Rendern und zeigen

```bash
bash .claude/skills/domain-model/scripts/render.sh
```

Ohne Argument erzeugt das Skript mit `views.mjs` die Ausschnitte (gibt es `docs/model-views.json`)
und rendert `docs/domain-model.puml` mit allen Ausschnitten; mit Argumenten nur die genannten
Dateien. Es lädt bei Bedarf PlantUML von Maven Central nach `~/.cache/plantuml/` und braucht Java
und Node; `!pragma layout smetana` macht Graphviz überflüssig. Nach jedem Rendern:

1. Den Ausschnitt der Änderung mit dem Read-Werkzeug ansehen: Ist alles Geänderte rot, sind
   Beschriftungen lesbar, überlappt etwas, fehlt ein Nachbar, der zum Verständnis nötig ist?
2. **Den Ausschnitt der Änderung** dem Owner zeigen (`SendUserFile` mit `display: "render"`), nicht
   das Gesamtbild: Das ist zu groß, um es zu prüfen. Der Owner denkt im Bild, nicht im
   PlantUML-Text.

## Ausschnitte und Markierungen

Das Gesamtmodell bleibt die einzige Quelle. Ausschnitte sind **gefilterte Auszüge** daraus, die
`scripts/views.mjs` bei jedem Rendern neu erzeugt: die Klassen im Fokus vollständig, ihre Nachbarn
zugeklappt (nur der Name), und nur die Pfeile, die eine Klasse im Fokus berühren. Kopf, Farben,
Markierungen und Legende kommen unverändert aus der Quelle. In einem Ausschnitt wird nichts von Hand
gezeichnet; die erzeugten `.puml` nie bearbeiten.

- **Bereiche.** Jede Klasse trägt im Modell genau einen Bereich als Tag:
  `class Encounter $begegnung {`, `enum Side <<value>> $begegnung {`. Die Bereiche mit Titel stehen
  unter `views` in `docs/model-views.json`. Fehlt einer Klasse der Tag, bricht `views.mjs` mit
  einer Meldung ab; eine neue Klasse bekommt ihn also gleich beim Anlegen. Ein Bereichsausschnitt
  zeigt alles Offene rot.
- **Markieren.** Was eine Änderung bringt oder streicht, bekommt ihr Kennzeichen (das Datum, bei
  mehreren am Tag mit Zusatz, z. B. `2026-11-06b`). Die Funktionen stehen im Kopf von
  `domain-model.puml`:

  | Was | Schreibweise | Im Ausschnitt |
  |---|---|---|
  | Neues oder geändertes Feld | `$new("2026-11-06", "quantityDie: number [0..1]")` | rot, fett |
  | Entfallendes Feld | `$gone("2026-11-06", "count: number")` | rot, durchgestrichen |
  | Neue Klasse | `class Foo $bereich $newClass("2026-11-06") {` | roter Rahmen |
  | Neuer Pfeil | `A "1" -$newArrow("2026-11-06")-> "*" B : name` | rot, dick |
  | Entfallender Pfeil | `A "1" -$goneArrow("2026-11-06")-> "*" B : name` | rot, gestrichelt |

  Ein geändertes Feld: die alte Fassung mit `$gone`, die neue mit `$new` direkt darunter, wie bei
  Änderungsverfolgung. Klassen mit markierten Feldern rahmt `views.mjs` selbst rot. Ein entfallender
  Pfeil oder eine entfallende Klasse bleibt bis zur Freigabe stehen: der Pfeil mit `$goneArrow`, bei
  der Klasse alle Felder mit `$gone`; das in der Notiz zur Änderung sagen. Ein Pfeil, der nur mit
  seiner entfallenden Klasse geht, braucht keine Markierung, wenn sie den Ausschnitt nur voller macht.
- **Änderung eintragen.** Unter `changes` in `docs/model-views.json`: `id` (das Kennzeichen),
  `file` (z. B. `2026-11-06-wuerfel-der-anzahl`), `title`, `approved: false`, optional `show` mit
  Klassen aus anderen Bereichen, die zum Verständnis daneben stehen sollen. Der Ausschnitt einer
  Änderung zeigt, was sie markiert, und die Nachbarn aus demselben Bereich; nur diese Änderung ist
  dort rot.
- **Nach der Freigabe** die Kennzeichen aus dem Modell nehmen (`$new("…", "x")` wird `x`, `$gone`-Zeilen,
  `$goneArrow`-Pfeile und Entfallenes löschen, `$newClass`/`$newArrow` entfernen), `approved: true` setzen und neu
  rendern. Freigegebene Änderungen erzeugt `views.mjs` nicht mehr neu; ihr Bild bleibt als Nachweis.
  Stehen Kennzeichen einer freigegebenen Änderung noch im Modell, bricht `views.mjs` ab.

## Ablauf

### 1. Erster Entwurf

- Anforderungen lesen (README, UI-Entwurf, bestehender Code). Gibt der Owner ein Vorbildprojekt an,
  dessen `domain-model.md` und `AGENTS.md` lesen und Aufbau und Ton übernehmen.
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
- Je Änderung: `.puml` ändern und markieren, die Änderung in `model-views.json` eintragen → rendern
  → Ausschnitt ansehen → `domain-model.md` nachziehen (Regeln, Begriffe, offene Fragen) →
  `ARCHITECTURE.md` prüfen → committen → Ausschnitt der Änderung zeigen → in wenigen Sätzen sagen,
  was sich geändert hat und was jetzt offen ist.
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

Für eine einzelne Änderung: Kennzeichen entfernen und `approved: true` (siehe *Ausschnitte und
Markierungen*), Status-Absatz in `domain-model.md` von „wartet auf Freigabe“ auf „freigegeben“
setzen, rendern, committen, dann in den Code übertragen.

Für eine ganze Version erst auf ausdrückliches „freigegeben“ des Owners: Status in `domain-model.md` auf „Freigegeben für
Version N (Datum)“, „Entwurf“ aus dem Diagrammtitel nehmen, README und `ARCHITECTURE.md` nachziehen,
committen und – wenn der Owner es sagt – nach `main` mergen. Ab jetzt gilt Grundsatz 1 für jede
Änderung.

## Kleinigkeiten, die Zeit sparen

- Mehrere Textstellen per Skript ersetzen, aber jede Ersetzung mit `assert s.count(alt) == 1`
  absichern; sonst trifft man die falsche Stelle oder gar keine.
- Commit-Autor nach der Regel in `AGENTS.md` setzen (z. B. per `git -c user.name=… -c
  user.email=… commit`), falls der Owner das festgelegt hat.
- Kleine, beschreibende Commits je Modelländerung; der Verlauf erzählt dann, wie das Modell
  entstanden ist.
