# Arbeiten an der Solo RPG Engine

- **Das Domänenmodell in `docs/domain-model.md` führt, immer.** Der Code folgt dem Diagramm, nie
  umgekehrt. Um das Modell zu ändern, zuerst das Diagramm ändern und die Zustimmung des Owners
  einholen, dann in den Code übertragen. Das Diagramm nie umzeichnen, damit es zum Code passt; wo der
  Code noch nicht folgt, steht das in `docs/domain-model.md` unter „Wo der Code noch nicht folgt“,
  bis es behoben ist. Die Quelle des Diagramms ist `docs/domain-model.puml` (PlantUML); nach jeder Änderung
  mit `bash .claude/skills/domain-model/scripts/render.sh` (ohne Argument) das Bild und alle
  Ausschnitte neu erzeugen. Wie man das Modell gemeinsam baut und rendert, steht im Skill
  `domain-model` (`.claude/skills/domain-model/`).
- **Das Gesamtbild ist zu groß, um es zu prüfen.** Der Owner prüft Änderungen am **Ausschnitt der
  Änderung** (`docs/changes/`), auf dem alles Neue rot markiert ist; die Bereichsausschnitte
  (`docs/views/`) dienen zum Nachschlagen. Ihm nie das Gesamtbild zur Freigabe schicken. Wie man
  markiert und Ausschnitte anlegt, steht im Skill unter „Ausschnitte und Markierungen“.
- **Regeln nachschlagen in `docs/regeln-kampf.md`**, nicht in den PDFs: Dort stehen alle Regeln und
  Tabellen zu Kampf und Begegnungen aus der Starter Edition (Charts) und Book 4, mit Seitenangabe und
  Stand in der App. Setzt die App eine Regel um, dort den Stand nachziehen; fehlt etwas, erst das
  PDF lesen und es dort ergänzen.
- Begriffe aus der Tabelle „Begriffe“ in `docs/domain-model.md` benutzen, in Code, Doku und Gespräch.
  Neue Begriffe kommen zuerst dort hinein.
- `ARCHITECTURE.md` legt die vier MVC-Regeln und die Schichtentabelle fest. Beide müssen stimmen.
- Die README beschreibt, was die App können soll; das Domänenmodell, wie es im Modell aussieht.
  Widersprechen sie sich, nachfragen statt raten.
- **Commits laufen unter dem Namen des Owners**: Autor und Committer
  `Scuzzar <scuzzarGalaxy@googlemail.com>`, nie Claude. **Nie Name oder E-Mail in den Befehl
  schreiben** (kein `-c user.email=…`), sonst muss der Owner den Befehl eigens freigeben. Stattdessen
  einmal je Sitzung `git config include.path ../.gitconfig-owner` (die Datei liegt im Repository und
  enthält Name und E-Mail), mit `git var GIT_AUTHOR_IDENT` prüfen, dass Scuzzar drinsteht, und dann
  schlicht `git commit …`, ebenso für Merges nach `main`. Den Commit als eigenen Befehl abschicken,
  nicht mit anderen verkettet, die Nachricht per `-F` aus einer Datei im Scratchpad.
- **Nach jeder Änderung an der App eine Vorschau schicken**: mit `npm run build:single` die ganze
  App als eine HTML-Datei bauen (`dist-single/index.html`), in den Scratchpad kopieren und dem
  Owner zum direkten Öffnen schicken. Dazu kurz sagen, was man zum Ausprobieren antippen muss.
