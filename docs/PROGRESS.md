# PB Portable Webport — Verified conversion progress

Last verified: 2026-10-28 (UTC)

## Test run
GitHub Actions [run 40662491631](https://github.com/hightblack2547-ux/pb/actions/runs/40662491631) completed successfully. Diagnostics are in the short-lived `pb-diagnostics-json` artifact; no source archive or extracted copyrighted game assets were uploaded.

### Source archive
- `Point-Blank-Portable-V1.1.rar`, 5,043,997,994 bytes
- 9,369 archive entries, 5,115 `.i3Pack` entries
- Biah / PFN2 archive parser: passes Dayak sample, 3/3 indexed files

### Export probes (ephemeral runner only)
| Asset | Converted | Triangles | GLB bytes | Notes |
|---|---|---:|---:|---|
| BurningHall visuals | yes | 30,144 | 2,737,416 | 58 meshes; 35 textures; 17 texture references still missing |
| BurningHall collisions | yes | 29,209 | 657,428 | 19 meshes; 16 respawn points found |
| AK-47 PBIC2013 | yes | 3,178 | 288,736 | textures complete |
| Colt45 | yes | 14,205 | 1,453,472 | textures complete |
| M4A1 | yes | 4,497 | 419,724 | 1 texture reference missing |

### Not yet complete
- Fix 17 missing map textures, one M4A1 texture reference
- Export character models and animation
- Integrate compatible map/weapon/collision assets with the webport runtime
- Test mobile input, Safari, FPS, and Netlify build
- Verify the user's legal right to redistribute assets before any public hosting

The GLBs were produced during transient CI runs but are deliberately **not uploaded as public artifacts**. Conversion success alone does **not** mean the playable web game is ready.
