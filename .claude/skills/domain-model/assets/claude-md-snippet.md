- **Das Domänenmodell in `docs/domain-model.md` führt, immer.** Der Code folgt dem Diagramm, nie
  umgekehrt. Um das Modell zu ändern, zuerst das Diagramm ändern und die Zustimmung des Owners
  einholen, dann in den Code übertragen. Das Diagramm nie umzeichnen, damit es zum Code passt; wo der
  Code noch nicht folgt, steht das in `docs/domain-model.md` unter „Wo der Code noch nicht folgt“,
  bis es behoben ist. Die Quelle des Diagramms ist `docs/domain-model.puml` (PlantUML); nach jeder
  Änderung Bild und Ausschnitte neu erzeugen (Skill `domain-model`). Änderungen prüft der Owner am
  Ausschnitt der Änderung mit roter Markierung, nicht am Gesamtbild.
- Begriffe aus der Tabelle „Begriffe“ in `docs/domain-model.md` benutzen, in Code, Doku und Gespräch.
  Neue Begriffe kommen zuerst dort hinein.
