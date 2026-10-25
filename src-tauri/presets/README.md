# Apple device catalog

100 model families (55 iPhones, 45 iPads), indexed from Apple's identification pages on 2026-10-24. Regional radios, colors and storage capacities are not separate devices. Published CPU/GPU count variants are retained as arrays, including 9/10-core M4/M5 iPad Pro variants.

Every row links its hardware specification. Supplemental CPU/GPU and model-specific RAM references are merged by scripts/complete-apple-specs.mjs, using the compact iFixit API evidence and a curated reference table. The catalog includes sub-GB RAM and storage-dependent memory variants. GPU names describe hardware, not captured WebGL renderer strings.

These are **hardware-specification presets, not real-device fingerprint captures**. The library displays this status. No measured WebGL, canvas, audio, fonts, browser CPU count or TLS dataset was supplied. Physical CPU/RAM specifications seed editable simulation defaults. All bundled models have explicit reference values; no blanket 4 cores / 4 GB fallback is used. These are not measured browser values. Unknown WebGL/audio/media overrides are omitted, leaving engine defaults. The profile editor may apply its normal defaults when creating a profile; those are not device measurements.

Physical pixels come from Apple. CSS dimensions and DPR are simulation defaults, not measured browser viewports. Display zoom, Safari toolbars, mini-device scaling and folding states can differ. Older Plus phones use a conventional 414 x 736 viewport despite their downsampled panel. Refresh rate is a preset maximum (120 Hz for ProMotion, otherwise 60). iPhone Duo uses its inner display only.

The existing Chromium engine runs these entries. CriOS UA, iOS 18 string, touch settings and TLS are editable simulation defaults, not evidence of WebKit fidelity, old-device OS support or compatibility. Naming a chip does not emulate that chip. No entry is marked as a measured fingerprint.

Refresh: run scripts/apple-catalog.mjs, scripts/fetch-apple-specs.mjs, then scripts/build-apple-catalog.mjs with Node. Also run scripts/fetch-ifixit-specs.mjs and scripts/complete-apple-specs.mjs before validation/build. Review extraction and viewport defaults before committing. Raw temporary evidence is excluded from Git; short hardware excerpts and source URLs remain in the catalog. Runtime only reads the bundled catalog.
