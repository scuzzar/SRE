# Domänenmodell

**Dieses Diagramm führt.** Der Code folgt ihm, nie umgekehrt. Eine Änderung am Modell wird zuerst
hier gemacht, abgestimmt und dann in den Code übertragen. Das Diagramm wird nie umgezeichnet, damit
es zu dem passt, was der Code gerade tut. Solange der Code noch nicht nachgezogen hat, stehen die
Lücken unter [Wo der Code noch nicht folgt](#wo-der-code-noch-nicht-folgt).

> **Stand: Entwurf, noch nicht abgestimmt.** Die offenen Fragen stehen unter
> [Offene Fragen zum Entwurf](#offene-fragen-zum-entwurf). Erst wenn sie geklärt sind und der Owner
> das Modell freigibt, gilt es, und erst dann beginnt der Code.

![Domänenmodell](domain-model.png)

Die Quelle ist [`domain-model.puml`](domain-model.puml) (PlantUML). Nach jeder Änderung das Bild neu
erzeugen mit `bash .claude/skills/domain-model/scripts/render.sh docs/domain-model.puml`; Graphviz
ist nicht nötig.

Das Diagramm zeigt den **gespeicherten Stand** und die Referenzdaten, auf die er verweist: Daten und
Beziehungen, keine Operationen. **Blau** wird gespeichert. **Grau mit gestricheltem Rahmen** ist
flüchtig: Es besteht zwischen zwei Eingaben und wird nie gespeichert; es kommt nur ins Diagramm, wenn
sich ein Ablauf sonst nicht abbilden lässt. **Grün** sind Referenzdaten: feste Tabellen, überall
gleich. **Weiß** sind Werte und Wertelisten.

## Begriffe

Die Bezeichner im Code sind englisch, Oberfläche und Dokumentation deutsch. Diese Tabelle ist die
gemeinsame Sprache.

| Deutsch | Code | Was |
|---|---|---|
| … | `…` | … |

## Regeln, die das Bild nicht zeigt

- **Was draußen bleibt.** Was nicht gespeichert wird und keinen Ablauf über mehrere Eingaben trägt,
  gehört nicht ins Modell: welcher Screen offen ist, Reiter, Scrollposition, Farben, Formate.
- **Richtung der Pfeile.** Aus dem gespeicherten Stand in die Referenzdaten, aus Flüchtigem in den
  gespeicherten Stand; nie zurück.
- **Der Verlauf verweist, er kopiert nicht.** Er hält nur fest, was allein ihm gehört, und die
  Zahlen, die das Ergebnis entschieden haben. Worauf er verweist, wird nie gelöscht, sondern
  ausgeblendet (`retired`).
- …

## Offene Fragen zum Entwurf

1. **…:** … (Was hängt davon ab? Welche Möglichkeiten gibt es?)

## Wo der Code noch nicht folgt

Es gibt noch keinen Code.
