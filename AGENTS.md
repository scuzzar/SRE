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
- **Regeln nachschlagen in den Regeldokus**, nicht in den PDFs: `docs/regeln-kampf.md` (Kampf und
  Begegnungen), `docs/regeln-laufbahnen.md` (Laufbahnen der Erschaffung), `docs/regeln-schiffe.md`
  (Schiffe, Raumkampf, Vektorbewegung) und `docs/regeln-sternsystem.md` (Sternsysteme nach Book 6),
  je mit Seitenangabe und Stand in der App. Setzt die App eine Regel um, dort den Stand nachziehen;
  fehlt etwas, erst das PDF lesen und es im passenden Regeldoku ergänzen.
- **Oberfläche nach dem GUI-Handbuch** (`docs/gui-handbuch.md`): Ziehblatt, Reiter unten, Umschalter
  oben, Reihe zum Handeln im Daumenbereich, Blätter, Popups, Gesten, Farben und Texte. Jeder neue
  oder geänderte Bereich folgt ihm und geht durch die Prüfliste am Ende. Braucht etwas ein neues
  Muster, kommt es zuerst ins Handbuch und wird mit dem Owner abgestimmt, dann gebaut.
- Begriffe aus der Tabelle „Begriffe“ in `docs/domain-model.md` benutzen, in Code, Doku und Gespräch.
  Neue Begriffe kommen zuerst dort hinein.
- `ARCHITECTURE.md` legt die vier MVC-Regeln und die Schichtentabelle fest. Beide müssen stimmen.
- Die README beschreibt, was die App können soll; das Domänenmodell, wie es im Modell aussieht.
  Widersprechen sie sich, nachfragen statt raten.
- **Commits laufen unter dem Namen des Owners**: Autor und Committer
  `Scuzzar <scuzzarGalaxy@googlemail.com>`, nie Claude. **Nie Name oder E-Mail in den Befehl
  schreiben** (kein `-c user.email=…`), sonst muss der Owner den Befehl eigens freigeben. Stattdessen
  einmal je Sitzung `cp .gitconfig-owner .git/owner.gitconfig` und `git config include.path
  owner.gitconfig` (`.gitconfig-owner` liegt im Repository und enthält Name und E-Mail; die Kopie in
  `.git/` bleibt, auch wenn ein Zweig ohne die Datei ausgecheckt ist, etwa ein alter `main`). Dann
  schlicht `git commit …`, ebenso für Merges nach `main`. **Vor jedem Commit und jedem Merge** mit
  `git var GIT_AUTHOR_IDENT` prüfen, dass Scuzzar drinsteht. Den Commit als eigenen Befehl
  abschicken, nicht mit anderen verkettet, die Nachricht per `-F` aus einer Datei im Scratchpad.
- **Jeder Zweig bekommt immer einen sprechenden Namen**, der sagt, woran darin gearbeitet wird
  (z. B. `kampf-begegnungen`, nie `test` oder `neu`). Das gilt für neue Zweige ebenso wie für
  Worktrees.
- **GUI-Tests laufen lokal, wenn Code geändert ist** – nicht bei jeder Änderung:
  `npm run test:e2e` (oder `CI=1 npx playwright test`) muss vollständig grün sein, bevor etwas
  gepusht wird, das `src/`, `e2e/`, `playwright.config.ts`, `package.json` oder eine Bau- und
  CI-Konfiguration ändert. Die schlanke Push-CI prüft nur Typecheck, Lint und Unit-Tests und ersetzt
  die lokalen GUI-Tests nicht. **Reine Doku- und Modelländerungen** (`docs/`, `README.md`,
  `AGENTS.md`, `ARCHITECTURE.md`, Kommentare im Code) brauchen keine GUI-Tests; `npm run check`
  bleibt, wo Code mitgezogen ist. Ein bekannter Wackelkandidat gilt als grün, wenn er einzeln
  nachgespielt besteht – dann nachziehen, nicht den Lauf wiederholen.
- **`main` füllt nur der Owner**: Auf `origin/main` pushen und nach `main` mergen darf ich nur nach
  ausdrücklicher Weisung im laufenden Gespräch. Grüne Tests, eine geschickte Vorschau und ein
  „umsetzen“ sind **keine** Freigabe für `main`. Weicht `origin/main` von `main` ab (andere
  Sitzung, anderer Zweig), zuerst fragen – nie einfach zusammenführen und pushen.
- **Nach jeder Änderung an der App eine Vorschau schicken**: mit `npm run build:single` die ganze
  App als eine HTML-Datei bauen (`dist-single/index.html`), in den Scratchpad kopieren und dem
  Owner zum direkten Öffnen schicken. Dazu kurz sagen, was man zum Ausprobieren antippen muss.

## Bauen, Testen, Anschauen

- **Nach jeder Änderung an Code:** `npm run check` (Typecheck, Lint mit den
  Schichtenregeln, Unit-Tests); wann zusätzlich die GUI-Tests laufen, steht oben.
- **App headless anschauen/bedienen:** Playwright-Chromium ist installiert
  (`~/.cache/ms-playwright`). Kurzes Skript: `npm run build`, dann
  `npx vite preview --port 4173` im Hintergrund, Seite öffnen, Screenshot in
  den Scratchpad legen und den Screenshot ansehen.
- Alle Befehle mit Erklärungen: `ARCHITECTURE.md` unter „Befehle“.
