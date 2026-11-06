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
- Begriffe aus der Tabelle „Begriffe“ in `docs/domain-model.md` benutzen, in Code, Doku und Gespräch.
  Neue Begriffe kommen zuerst dort hinein.
- `ARCHITECTURE.md` legt die vier MVC-Regeln und die Schichtentabelle fest. Beide müssen stimmen.
- Die README beschreibt, was die App können soll; das Domänenmodell, wie es im Modell aussieht.
  Widersprechen sie sich, nachfragen statt raten.
- **Commits laufen unter dem Namen des Owners**: Autor und Committer
  `Scuzzar <scuzzarGalaxy@googlemail.com>`, nie Claude. Je Befehl setzen
  (`git -c user.name=Scuzzar -c user.email=scuzzarGalaxy@googlemail.com commit …`), ebenso für
  Merges nach `main`.
- **Nach jeder Änderung an der App eine Vorschau schicken**: mit `npm run build:single` die ganze
  App als eine HTML-Datei bauen (`dist-single/index.html`), in den Scratchpad kopieren und dem
  Owner zum direkten Öffnen schicken. Dazu kurz sagen, was man zum Ausprobieren antippen muss.
