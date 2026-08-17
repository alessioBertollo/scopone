#!/usr/bin/env bash
# Rigenera i PNG delle icone dai sorgenti SVG in assets/source/.
#
# I PNG sono committati perché servono alla build, ma la fonte di verità sono
# gli SVG: per cambiare l'icona si modifica l'SVG e si rilancia questo script.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "Serve rsvg-convert. Su macOS: brew install librsvg" >&2
  exit 1
fi

src="assets/source"
out="assets"

render() {
  local file="$1" size="$2" dest="$3"
  rsvg-convert -w "$size" -h "$size" "$src/$file" -o "$out/$dest"
  echo "  $dest  ${size}x${size}"
}

echo "Rigenerazione icone:"
render icon.svg            1024 icon.png
render icon-foreground.svg 1024 android-icon-foreground.png
render icon-background.svg 1024 android-icon-background.png
render icon-monochrome.svg 1024 android-icon-monochrome.png
render icon-foreground.svg 1024 splash-icon.png
render icon.svg              48 favicon.png
echo "Fatto."
