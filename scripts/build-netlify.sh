#!/usr/bin/env bash
# Netlify and GitHub Actions use exactly the same source build steps.
# This generates an unofficial static FPS prototype WITHOUT game-owned assets.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
echo "Building PB Webport static prototype with Node $(node --version)"

# In Netlify's clean checkout there is no vendored webport. Only public
# source code is cloned. Licensed game assets must never be auto-published.
if [ ! -f webport/package.json ]; then
  git clone --depth 1 https://github.com/LeandroDettmer/point-blank-webport.git webport
fi

npm ci --ignore-scripts --no-audit --no-fund --prefix webport
npm ci --ignore-scripts --no-audit --no-fund --prefix webport/server
# Allow on-screen touch input in the real Webport offline engine on iPhone.
# This patch is applied only to the temporary upstream checkout, never to its repository.
node scripts/patch-mobile-input.mjs webport/src/game/input.ts
npm run build:prod --prefix webport

node --check web-ui/app.js
node --check web-ui/training/training.js
mkdir -p webport/dist/launcher webport/dist/training webport/map3d/src
cp web-ui/index.html web-ui/style.css web-ui/app.js webport/dist/launcher/
cp web-ui/training/index.html web-ui/training/training.js web-ui/training/training.css webport/dist/training/
cp web-ui/map3d/index.html webport/map3d/
cp web-ui/map3d/src/main.js webport/map3d/src/

# Root argument is positional. --root is NOT supported by this Vite CLI.
(
  cd webport
  npx --no-install vite build map3d --base /map3d/ --outDir ../dist/map3d --emptyOutDir
)

# The launcher sends players to the actual upstream client, not our synthetic raycast demo.
node --check web-ui/real-game/pb-touch.js
node --check web-ui/real-game/import-private-assets.js
node --check web-ui/real-game/private-assets-sw.js
node --check scripts/patch-mobile-input.mjs
node --check scripts/package-real-game.mjs
node scripts/package-real-game.mjs webport/dist

# Build the user's requested non-fake armory / character / map / rank / title UI.
# Asset lists load only from authorized /assets/ manifests (including private Safari cache).
mkdir -p webport/collection
cp web-ui/collection/index.html web-ui/collection/main.js webport/collection/
(
  cd webport
  npx --no-install vite build collection --base /collection/ --outDir ../dist/collection --emptyOutDir
)
node scripts/export-title-catalog.mjs webport/src/lobby/core/titleData.ts webport/dist/collection/title-catalog.json

test -s webport/dist/index.html
test -s webport/dist/collection/index.html
test -s webport/dist/collection/title-catalog.json
test -n "$(find webport/dist/collection -type f -name '*.js' -print -quit)"
test -s webport/dist/game/index.html
test -s webport/dist/play/index.html
test -s webport/dist/pb-touch.js
test -s webport/dist/import-private-assets.js
test -s webport/dist/pb-private-sw.js
test -s webport/dist/launcher/index.html
test -s webport/dist/launcher/app.js
test -s webport/dist/training/index.html
test -s webport/dist/training/training.js
test -s webport/dist/map3d/index.html
test -n "$(find webport/dist/map3d -type f -name '*.js' -print -quit)"
test -n "$(find webport/dist/bundle -type f -name '*.js' -print -quit)"

echo 'Build succeeded; publish directory: webport/dist'
echo 'Original Zepetto-owned game assets are NOT included. Offline real Webport engine requires authorized Cross assets.'
