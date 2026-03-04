#!/bin/bash
# Build a zip file for Chrome Web Store / Firefox AMO submission.
# Usage: bash build.sh

set -e

OUT="ntuitive.zip"
rm -f "$OUT"

powershell -Command "Compress-Archive -Path manifest.json,popup.html,popup.js,settings.js,defaults.js,bridge.js,content.js,courses.js,courselinks.js,outline.js,viewer.js,darktheme.js,download.js,icon16.png,icon48.png,icon128.png,LICENSE -DestinationPath $OUT -Force"
echo "Built $OUT"
