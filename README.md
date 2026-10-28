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
