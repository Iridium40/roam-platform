#!/bin/bash
# generate-pwa-icons.sh
# Generates PWA icons from a source image using ImageMagick
#
# Usage: ./scripts/generate-pwa-icons.sh [source-logo.png]
#
# If no source is provided, it will use public/admin_logo.png
#
# Requirements: ImageMagick (convert command)
# Install: brew install imagemagick (Mac) or apt install imagemagick (Linux)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

SOURCE=${1:-"$PROJECT_DIR/public/admin_logo.png"}
OUTPUT_DIR="$PROJECT_DIR/public/icons"

if [ ! -f "$SOURCE" ]; then
  echo "Error: Source file '$SOURCE' not found"
  echo "Usage: ./scripts/generate-pwa-icons.sh source-logo.png"
  echo "Provide a square PNG image (512x512 or larger recommended)"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Standard PWA icon sizes
SIZES=(16 32 72 96 128 144 152 167 180 192 384 512)

echo "Generating PWA icons from: $SOURCE"
echo "Output directory: $OUTPUT_DIR"
echo ""

for size in "${SIZES[@]}"; do
  echo "  Creating icon-${size}x${size}.png"
  convert "$SOURCE" -resize "${size}x${size}" -background white -gravity center -extent "${size}x${size}" "$OUTPUT_DIR/icon-${size}x${size}.png"
done

# Create favicon.ico (multi-size)
echo "  Creating favicon.ico"
convert "$SOURCE" -resize 16x16 -background white -gravity center -extent 16x16 "$OUTPUT_DIR/favicon-16.png"
convert "$SOURCE" -resize 32x32 -background white -gravity center -extent 32x32 "$OUTPUT_DIR/favicon-32.png"
convert "$SOURCE" -resize 48x48 -background white -gravity center -extent 48x48 "$OUTPUT_DIR/favicon-48.png"
convert "$OUTPUT_DIR/favicon-16.png" "$OUTPUT_DIR/favicon-32.png" "$OUTPUT_DIR/favicon-48.png" "$OUTPUT_DIR/favicon.ico"
rm "$OUTPUT_DIR/favicon-16.png" "$OUTPUT_DIR/favicon-32.png" "$OUTPUT_DIR/favicon-48.png"

# Create maskable icon (with padding for safe zone)
echo "  Creating maskable icon"
convert "$SOURCE" -resize 384x384 -gravity center -background "#3b5998" -extent 512x512 "$OUTPUT_DIR/icon-maskable-512x512.png"

# Create shortcut icons (simple colored backgrounds with icons)
echo "  Creating shortcut icons"
convert -size 96x96 xc:"#3b5998" "$OUTPUT_DIR/shortcut-dashboard.png"
convert -size 96x96 xc:"#3b5998" "$OUTPUT_DIR/shortcut-users.png"
convert -size 96x96 xc:"#3b5998" "$OUTPUT_DIR/shortcut-bookings.png"
convert -size 96x96 xc:"#3b5998" "$OUTPUT_DIR/shortcut-businesses.png"

# Create badge icon
echo "  Creating badge icon"
convert "$SOURCE" -resize 72x72 -background white -gravity center -extent 72x72 "$OUTPUT_DIR/badge-72x72.png"

echo ""
echo "✅ PWA icons generated successfully!"
echo ""
echo "Generated files:"
ls -la "$OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "1. Review the generated icons in $OUTPUT_DIR"
echo "2. Consider using a proper source logo (512x512 square PNG)"
echo "3. For better maskable icons, use https://maskable.app/editor"
