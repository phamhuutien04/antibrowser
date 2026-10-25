# Upstream v2.1.1 integration

Source: https://github.com/ProxyShard/ShardBrowser/releases/tag/v2.1.1 (870ad1d).
Integrated the v2.1.0 to v2.1.1 source changes into this customized checkout.

Preserved Vietnamese (3415 matching locale keys), the 100-device Apple catalog, mobile screen/DPR preservation and template restoration, desktop-only startup, and the hidden sidebar API row. The new upstream runtime/swap protocol supersedes the earlier local runtime_files staging implementation. Team rights test data lives in tests/fixtures, not a web runtime.

Validation: desktop:build succeeded for 2.1.1; cargo check --lib passed; 91 frontend unit tests, 80 script tests, 10 team-model tests and 6 team-wire tests passed. The local engine screen probe was validated before integration; no external team service was configured or deployed.

A pre-integration source snapshot and build logs are stored in the ignored backup folder .upstream-backup-v2.1.1-1792907321717. Prior executable copies remain under src-tauri/target/debug. New UI translations are a machine-assisted draft.
