#!/usr/bin/env bash
# Rendert ein PlantUML-Diagramm als PNG neben die Quelle.
# Lädt PlantUML beim ersten Aufruf von Maven Central; braucht nur Java (kein Graphviz,
# die Diagramme nutzen "!pragma layout smetana").
#   bash render.sh docs/domain-model.puml
set -euo pipefail

src="${1:-docs/domain-model.puml}"
version="${PLANTUML_VERSION:-1.2024.7}"
jar="${PLANTUML_JAR:-$HOME/.cache/plantuml/plantuml-$version.jar}"

if [[ ! -f "$src" ]]; then
  echo "Quelle nicht gefunden: $src" >&2
  exit 1
fi
if ! command -v java >/dev/null; then
  echo "Java fehlt; PlantUML braucht eine Java-Laufzeit." >&2
  exit 1
fi
if [[ ! -f "$jar" ]]; then
  mkdir -p "$(dirname "$jar")"
  curl -sSfL -o "$jar" \
    "https://repo1.maven.org/maven2/net/sourceforge/plantuml/plantuml/$version/plantuml-$version.jar"
fi

java -jar "$jar" -tpng "$src" 2>&1 | grep -v '^Picked up JAVA_TOOL_OPTIONS' || true
echo "${src%.puml}.png"
