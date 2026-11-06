#!/usr/bin/env bash
# Rendert PlantUML-Diagramme als PNG neben die Quelle.
# Lädt PlantUML beim ersten Aufruf von Maven Central; braucht nur Java (kein Graphviz,
# die Diagramme nutzen "!pragma layout smetana").
#   bash render.sh                          erzeugt die Ausschnitte (views.mjs) und rendert
#                                           docs/domain-model.puml mit allen Ausschnitten
#   bash render.sh docs/domain-model.puml   rendert nur die genannten Dateien
set -euo pipefail

version="${PLANTUML_VERSION:-1.2024.7}"
jar="${PLANTUML_JAR:-$HOME/.cache/plantuml/plantuml-$version.jar}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $# -eq 0 ]]; then
  views=()
  if [[ -f docs/model-views.json ]]; then
    out="$(node "$here/views.mjs" docs)"
    mapfile -t views <<<"$out"
  fi
  set -- docs/domain-model.puml "${views[@]}"
fi
for src in "$@"; do
  if [[ ! -f "$src" ]]; then
    echo "Quelle nicht gefunden: $src" >&2
    exit 1
  fi
done
if ! command -v java >/dev/null; then
  echo "Java fehlt; PlantUML braucht eine Java-Laufzeit." >&2
  exit 1
fi
if [[ ! -f "$jar" ]]; then
  mkdir -p "$(dirname "$jar")"
  curl -sSfL -o "$jar" \
    "https://repo1.maven.org/maven2/net/sourceforge/plantuml/plantuml/$version/plantuml-$version.jar"
fi

# "UNKNOWN ENTITY" meldet PlantUML für jede ausgeblendete Klasse eines Ausschnitts; das ist kein Fehler.
java -jar "$jar" -tpng "$@" 2>&1 | grep -v -e '^Picked up JAVA_TOOL_OPTIONS' -e '^UNKNOWN ENTITY$' || true
for src in "$@"; do echo "${src%.puml}.png"; done
