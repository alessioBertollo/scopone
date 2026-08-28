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

# Avatar: sagome monocrome mostrate con tintColor, che ne cambia il colore a
# runtime per seguire il tema. 128 basta: si vedono a 24-32 punti, e su uno
# schermo a tripla densità sono 96 pixel.
mkdir -p "$out/avatars"
for sorgente in "$src"/avatars/*.svg; do
  nome="$(basename "$sorgente" .svg)"
  rsvg-convert -w 128 -h 128 "$sorgente" -o "$out/avatars/$nome.png"
  echo "  avatars/$nome.png  128x128"
done
echo "Fatto."
