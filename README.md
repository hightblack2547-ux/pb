# PB Portable → Webport development

This is an **unofficial, experimental** browser porting workspace. It contains
tools, tests, status reports and a custom Thai web launcher. It does **not**
contain or distribute Point Blank game models, textures, maps, binaries or
credentials.

## What's working

- Reads **Biah/PFN2** Point Blank Portable .i3Pack containers.
- Converts and validates selected map, collision, weapon and character GLBs in
  **temporary GitHub Actions runners**.
- Validates the 100-clip cross-character animation export for REBEL Male
  (visual correctness and licensing still require review).
- Builds the upstream Point Blank Webport TypeScript/Vite client for static
  hosting.
- Builds **/launcher/** — a responsive Thai guest-login, lobby, armory and
  offline-training menu, with a check for required assets before attempting
  to start a game.

See [verified progress](docs/PROGRESS.md) for measurements and limitations.

## Automatic GitHub → Netlify deploy

The public repository includes `netlify.toml` and
`scripts/build-netlify.sh`. A Netlify project connected to the
`main` branch can now build the prototype automatically after each commit.

- **Base directory:** repository root (leave blank)
- **Build command:** `bash scripts/build-netlify.sh` (provided by `netlify.toml`)
- **Publish directory:** `webport/dist` (provided by `netlify.toml`)
- **Node.js:** 24
- **Entrypoints:** `/` redirects to `/launcher/`; the 3D prototype is at `/map3d/`.

The build clones the upstream public webport source, builds the
TypeScript/Vite client, and includes the Thai launcher, mobile FPS controls
and 3D GLB loader. GitHub Actions runs the **same build script** to verify
that these steps work before production deployment.

**Important:** A successful GitHub Actions run is not confirmation of a
Netlify deploy. Check the linked Netlify site's **Deploys** page for
`Published` status and test its URL.

**Point Blank ownership:** The public build does **not** include Burning
Hall textures/GLBs, licensed character models, weapon models, or an online
multiplayer backend. Do not add copyrighted game data to this public
repository without explicit distribution rights. The GLB loader supports
`/assets/maps/burninghall/visual.glb`,
`/assets/maps/burninghall/collision.glb`, and
`/assets/maps/burninghall/collision.json` only when those authorized
assets have been separately installed. Without them it clearly falls back
to an original test map.

## Get the Netlify shell

Go to [Actions → Check static Safari / Netlify build](https://github.com/hightblack2547-ux/pb/actions/workflows/pb-web-build.yml).
Open a successful run and download **pb-webport-shell-netlify** under
Artifacts. Extract the ZIP, and the folder's contents can be used as a static
site build. The launcher is at `/launcher/`.

This is **only the browser client and prototype launcher**; it will not start
a real match until compatible game assets have been added *with permission*.
Its Guest nickname is stored on the device and is **not an authenticated
Point Blank account**. The multiplayer account/database/game server is not
provided by Netlify static hosting.

## Asset diagnostics

[Actions → Check PB Portable RAR](https://github.com/hightblack2547-ux/pb/actions/workflows/pb-cloud-check.yml)
runs the private conversion probe in an ephemeral GitHub worker. Only a JSON
**diagnostic report** is uploaded as a GitHub Actions artifact; original game
resources are **not** uploaded to the public repository.

**Privacy:** This repository and its workflow logs are public. Do not expose
sensitive Google Drive files or secrets. Avoid granting public edit access to
Drive files.

**Rights:** Only process or deploy game files you are authorized to use.
A successful technical conversion does not grant redistribution rights.
