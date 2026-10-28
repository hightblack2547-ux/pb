# Point Blank Portable — Cloud Inspector

This repository hosts diagnostic scripts for checking a user-provided Point Blank Portable RAR archive without executing any game executables or publishing game assets.

## Run

Open **Actions → Check PB Portable → Run workflow**, provide the Google Drive file ID as `drive_file_id`, and launch. Download the `pb-diagnostics-json` artifact from the completed run to inspect the results.

The workflow downloads the archive to an ephemeral runner, extracts only one small `.i3Pack` sample, and tests `pbx unpack`. The raw game archive and extracted assets are **not** uploaded to GitHub. The original client may not be compatible with the web port.

**Security:** This repository is public. Treat workflow inputs and logs as potentially public. Do not provide a private file ID without first verifying sharing permissions. Do not grant public edit access to any Google Drive file.

**Copyright:** Only process files you have rights to use. This tool grants no redistribution rights for commercial game assets.
