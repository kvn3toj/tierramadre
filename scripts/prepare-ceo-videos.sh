#!/bin/bash

# Script to prepare CEO collection videos for deployment
# 1. Rename videos to URL-friendly format
# 2. Convert .mov to .mp4
# 3. Generate poster images

set -e

IMAGES_DIR="public/images"
cd "$(dirname "$0")/.."

echo "📹 Preparing CEO Collection Videos..."
echo ""

# Rename videos to clean format (901.mp4, 902.mp4, etc.)
echo "🔄 Renaming videos..."
mv "$IMAGES_DIR/901 Reino de Paz.mp4" "$IMAGES_DIR/901.mp4" 2>/dev/null || echo "  ✓ 901.mp4 already exists"
mv "$IMAGES_DIR/902 Tierra Sagrada.mp4" "$IMAGES_DIR/902.mp4" 2>/dev/null || echo "  ✓ 902.mp4 already exists"
mv "$IMAGES_DIR/903 Eco de Luz.mp4" "$IMAGES_DIR/903.mp4" 2>/dev/null || echo "  ✓ 903.mp4 already exists"
mv "$IMAGES_DIR/904 Alma de la Montaña.mp4" "$IMAGES_DIR/904.mp4" 2>/dev/null || echo "  ✓ 904.mp4 already exists"
mv "$IMAGES_DIR/905 Canto del Río.mp4" "$IMAGES_DIR/905.mp4" 2>/dev/null || echo "  ✓ 905.mp4 already exists"
mv "$IMAGES_DIR/907 Abrazo del Bosque.mp4" "$IMAGES_DIR/907.mp4" 2>/dev/null || echo "  ✓ 907.mp4 already exists"

# Convert .mov to .mp4 if ffmpeg is available
if command -v ffmpeg &> /dev/null; then
  echo ""
  echo "🎬 Converting .mov to .mp4..."
  if [ -f "$IMAGES_DIR/906 Corazón de la Mina.mov" ]; then
    ffmpeg -i "$IMAGES_DIR/906 Corazón de la Mina.mov" -vcodec h264 -acodec aac -strict -2 -movflags +faststart "$IMAGES_DIR/906.mp4" -y
    rm "$IMAGES_DIR/906 Corazón de la Mina.mov"
    echo "  ✓ Converted 906.mov to 906.mp4"
  else
    echo "  ✓ 906.mp4 already exists"
  fi
else
  echo ""
  echo "⚠️  ffmpeg not found. Please install ffmpeg to convert .mov files:"
  echo "   brew install ffmpeg"
  echo ""
  echo "   Then manually convert: 906 Corazón de la Mina.mov -> 906.mp4"
fi

echo ""
echo "🖼️  Generating poster images..."

# Check if ffmpeg is available for poster generation
if command -v ffmpeg &> /dev/null; then
  for video in "$IMAGES_DIR"/90[1-7].mp4; do
    if [ -f "$video" ]; then
      filename=$(basename "$video" .mp4)
      poster="$IMAGES_DIR/${filename}-poster.jpg"

      if [ ! -f "$poster" ]; then
        ffmpeg -i "$video" -ss 00:00:00.500 -vframes 1 -q:v 2 "$poster" -y
        echo "  ✓ Generated ${filename}-poster.jpg"
      else
        echo "  ✓ ${filename}-poster.jpg already exists"
      fi
    fi
  done
else
  echo "⚠️  ffmpeg not found. Skipping poster generation."
  echo "   Install ffmpeg to generate posters: brew install ffmpeg"
fi

echo ""
echo "✅ Video preparation complete!"
echo ""
echo "Next steps:"
echo "1. Update collection.json in Google Drive with videoUrl and posterUrl fields"
echo "2. Run: npm run build"
echo "3. Test locally: npm run preview"
echo "4. Deploy: git push"
