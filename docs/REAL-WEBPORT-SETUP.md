# Point Blank Webport: real engine integration (V6)

This workspace builds the **actual MIT-licensed browser client code** from
[LeandroDettmer/point-blank-webport](https://github.com/LeandroDettmer/point-blank-webport).
The client uses TypeScript, Three.js and Rapier and supports local matches with
bots via its own `?play` route. It is **not** a reimplementation of the game in
`web-ui/map3d/`.

## Site routes

- **`/launcher/`**: optional custom Thai development menu, not the game login.
- **`/play/`**: checks for an installed, licensed PBCross map index,
  selected map visual/collision files and weapon metadata. Refuses to
  present the old synthetic training scene as an original map.
- **`/game/?play&map=<map-id>&bots=4`**: compiled original Webport client,
  using the upstream's offline bot mode. The HTML/JS here is made by the
  upstream Vite build, not the hand-written demo.
- **`/training/`**, **`/map3d/`**: older *synthetic prototype* experiments.
  They are retained for regression tests and are no longer the primary play
  button. They are **not** Point Blank maps.

The site package includes a provisional iPhone touch-to-keyboard and
touch-to-mouse bridge for offline bot matches, with the smallest Input.locked
patch in a temporary upstream checkout. The bridge must be evaluated on
iPhone Safari and is not guaranteed to support all weapons, menus or
multiplayer. It does not alter weapon/gameplay rules.

## GitHub -> Netlify

Connected Netlify projects can build this repository with `netlify.toml`.
Both Netlify and GitHub Actions run `scripts/build-netlify.sh` with Node 24.
The script clones the public source of Webport and compiles the original
browser game. It **does not** install the Zepetto Point Blank client or
export any assets.

The static bundle works as a website, **not a ready-to-play original
Point Blank game without original game files**.

## Private iPhone ZIP import (V7)

At `/play/` the **Private Assets ZIP** picker accepts a ZIP containing
previously exported, authorized **Point Blank Cross** web assets in any of
these layouts:

```text
assets/maps/index.json
assets/maps/<map-id>/visual.glb
assets/maps/<map-id>/collision.glb
assets/maps/<map-id>/collision.json
assets/weapons/models/index.json
assets/cross/weapons/weapons.json
assets/chars/...          # and the other Cross assets the engine requires
```

A ZIP created from the folder `public/assets/` is also accepted. The files
are decompressed on the device using `DecompressionStream('deflate-raw')`,
stored in Cache Storage under the user's Safari origin, and served to the
real Webport client via a scoped service worker. **Nothing is uploaded to
Netlify or GitHub**. The browser can evict this data at any time.

This is a bounded experiment: ZIP entries must use Store/Deflate, not
password protection or ZIP64, per-entry size is limited to 128 MB and
total uncompressed import per ZIP to 900 MB. Safari storage may have a lower
quota. Splitting an asset export into multiple ZIP parts is possible,
but complete Cross exports can be ~5 GB and are unlikely to fit on iPhone.
Partial assets will not make the game fully playable.

An original `.RAR`, `.i3Pack` or the user's Portable client cannot be
uploaded directly to this installer. It must first be exported in the
**Cross Webport asset layout** using compatible and authorized files.
This feature has passed syntax/build checks but **not** a full real-asset
iPhone Safari gameplay test.

## Weapon skins, maps, characters, UI, rank and titles (V8)

`/collection/` is an **offline Safari-friendly asset-driven menu** for the
requested narrow scope, without implementing online rooms or login.

- **Weapons and skins**: reads `/assets/weapons/models/index.json` and
  `/assets/cross/weapons/weapons.json`, lists actual model-to-item IDs,
  searches categories and previews the authorized GLB with Three.js.
  A chosen item is stored on-device and fed into the upstream Webport
  **offline** `?play` default loadout when its game-export metadata supports it.
  This is not an account inventory nor an assertion that every weapon
  model has complete animations, sounds and textures.
- **Characters**: lists `/assets/chars/index.json`, previews each GLB,
  and passes the selected character's `charRed`/`charBlue` query
  to the original offline Webport when launching from `/collection/`.
- **Maps**: lists `/assets/maps/index.json`, shows metadata, and
  previews a selected map's `visual.glb` only after tapping the
  **Preview map** button (to avoid freezing iPhone with huge 3D models).
- **Ranks and titles**: implements a local-only display/profile sandbox.
  Title IDs, rank requirements and badge/precedence conditions are
  exported from the publicly available source metadata of the upstream
  Webport. Local title acquisition, equipment and rank edits simulate
  the UI; **they are not authoritative**. Real rank/EXP/title ownership,
  purchases and persistence between players require the upstream Node
  server and Postgres. Original rank/title names require the user's
  licensed Cross UI strings (`/assets/ui/cross/strings.json`).
- **UI**: this menu is custom and does not reproduce licensed original
  art. The upstream game also has its own Cross inventory/profile
  screens, which require licensed UI assets and its login/server flow.

No Zepetto game models, icons, textures or art were added to the public
GitHub repository or to the Netlify build.

## Game assets

The upstream client expects its own **Point Blank Cross** installation.
Export scripts are provided by
[LeandroDettmer/pb-extract-tools-public](https://github.com/LeandroDettmer/pb-extract-tools-public).
Its documented complete export writes around 5 GB of assets to
`public/assets/`, including maps, collision, character and weapon models,
animation and UI. Those files are **not** included in either GitHub
repository and must not be made publicly downloadable without redistribution
rights. A Portable/2017 archive is not a substitute for Cross: exporters
and game IDs might not match.

For local/private testing when authorized, the upstream's documented steps are:

```sh
git clone https://github.com/LeandroDettmer/point-blank-webport.git
git clone https://github.com/LeandroDettmer/pb-extract-tools-public.git pb-extract-tools
# Arrange the two clones side by side; point-blank-webport/Clients/PBCross
# needs an authorized PBCross client folder.
cd point-blank-webport
npm install
npm --prefix server install
npm --prefix ../pb-extract-tools install
npm run pbx -- doctor
npm run pbx -- export all --client cross
npm run dev:all
```

That full stack requires a host with Node, Docker and PostgreSQL; these commands
cannot run directly on an iPhone. Local offline testing needs the exported
assets but not the game-account server; complete online login/lobby/progression
needs the upstream Node server plus PostgreSQL.

Netlify static hosting by itself cannot run the long-lived TCP/WebSocket game
server or PostgreSQL. A separate permitted backend deployment is required for
online rooms. Never put database credentials or access tokens into public GitHub
files or static JavaScript.

## What has actually been checked?

The actual Vite Webport client and /game/ packaging are checked by GitHub
Actions. That confirms compilation, **not** rendering/performance with real
assets or reliable mobile touch controls. The earlier Burning Hall
visual/collision probes were performed with a Portable archive in temporary
GitHub runners, but the resulting assets were not published and their
compatibility with the Cross client is unverified.

## Legal

This is an unofficial development workspace. Webport code is MIT licensed.
The Point Blank game assets, game data and trademarks are Zepetto property,
not MIT licensed. Do not upload game assets to a public Netlify domain without
the necessary rights.
