# Weapon + Original UI discovery • Portable V1.1

Verified via [GitHub Actions run 40711557976](https://github.com/hightblack2547-ux/pb/actions/runs/40711557976). All game resources were read in an **ephemeral** worker and are absent from the public repository.

## Inventory

- Original archive: 5,043,997,994 bytes; 9,369 files; 5,115 `.i3Pack` packs
- **2,344 weapon packs** (includes skins/variants; not 2,344 unique weapon mechanics)
- **357 UI/GUI packs**
- UI_V11: 195/195 `.i3UIs` scene layouts parsed (1024 × 768 design coordinates)
- UI_Re2: 187/187 `.i3UIs` scene layouts parsed (one additional `.i3UIe`)
- UI_Project_Lobby: 1 classic GUI scene, **516 controls**
- UI_Project_Popup: 2 classic GUI scenes, **1,261 controls**

## Weapon GLB conversion probes

All 12 **model conversion jobs passed**, but conversion alone does not prove the weapons can be fired in the browser or that the animations / sound effects work.

| Source | Triangles | Meshes | Missing textures |
| --- | ---: | ---: | ---: |
| Weapon_AK-47_PBIC2013 | 3,178 | 13 | 0 |
| Weapon_Colt45 | 14,205 | 3 | 0 |
| Weapon_M4A1 | 4,497 | 5 | 1 |
| Weapon_Aks74u | 4,982 | 4 | 0 |
| Weapon_SPAS_15_PBSC2013_NonLogo | 2,310 | 3 | 0 |
| Weapon_DesertEagle_GRS | 1,184 | 3 | 0 |
| Weapon_870MCS_SL | 1,532 | 6 | 2 (no textures present in exported model) |
| Weapon_Karambit | 1,758 | 1 | 0 |
| Weapon_MP7 | 2,964 | 6 | 1 |
| Weapon_K-2 | 1,831 | 3 | 0 |
| Weapon_Ak-47_Boar_Zombie | 17,600 | 11 | 0 |
| Weapon_AUG-A3_ESports | 3,441 | 4 | 0 |

## Original interface resources located

- **Login artwork:** `UI_Main.i3Pack/Login.i3i` and `UI_Loading.i3Pack/Login.i3i` (PNG conversion test in progress; no artwork has been published).
- **Classic lobby:** `UI_Project_Lobby.i3Pack`; source GUI includes map, mode, host, player slots and room controls.
- **Classic popups and weapon stats:** `UI_Project_Popup.i3Pack`; controls include `weDamage`, `weRapid`, `weHitRate`, vertical/horizontal recoil, bullet and range fields.
- **UI_V11:** HUD, respawn, character/weapon selection, inventory, lobby create room, loading and results; original 1024 × 768 layout.
- **UI_Re2:** lobby, shop, weapon inventory, chat, login waiting queue, password room and other scenes.
- **Texture atlases:** `UI_Main-SourceA` has Source01–03; `UI_Main-SourceB` has Source04–06; `UI_Interface` contains Menu_Bg and map images.

The extraction test reads control positions and image references. Re-rendering the original screens in HTML/CSS/Canvas, matching atlas regions to controls, and touch adaptation **remain separate engineering tasks**.

## Original UI texture conversion

The read-only texture probe in [run 40712069586](https://github.com/hightblack2547-ux/pb/actions/runs/40712069586) decoded I3IB to PNG **in memory** (the PNG data was not uploaded).

| Source | Converted PNG textures | Known issue |
| --- | ---: | --- |
| UI_Loading | 3 / 3 | Includes `Login.i3i` (1024 × 1024), `Loading.i3i` (1024 × 1024) |
| UI_Interface | 10 / 10 tested | Further images exist in the pack |
| UI_Ingame-Hud | 8 / 8 | HUD textures are 1024 × 512 |
| UI_Main-SourceB | 4 / 4 | 512 × 512 atlases |
| UI_Main_V1.1_ClanMark | 1 / 1 | 512 × 512 atlas |
| UI_Main | 0 / 2 | Non-I3IB image container; still needs decoding |
| UI_Main-SourceA | 0 / 3 | Non-I3IB image container; still needs decoding |

This is a **decoder test**, not finished visual integration. Actual game menu art is intentionally absent from the public static ZIP.

## Working front-end scaffold (no copyrighted art)

The `web-ui/` directory contains a custom Thai **development launcher** with guest nickname, lobby tabs, 12 verified weapon entries, and an offline-start gate that checks for required assets. It builds into `/launcher/` in the Netlify-ready static shell via the [web-build workflow](https://github.com/hightblack2547-ux/pb/actions/workflows/pb-web-build.yml).

The guest login is **local only**, and the chosen weapon is **not yet connected to the actual weapon system**.

**Publishing:** Do not publish proprietary Point Blank models, textures, or interface artwork without the necessary rights. Original resources are intentionally excluded from the public ZIP.
