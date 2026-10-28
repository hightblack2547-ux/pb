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
