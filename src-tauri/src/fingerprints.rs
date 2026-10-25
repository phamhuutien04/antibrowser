// User-managed Fingerprint Library.
//
// Each entry is a full FingerprintConfig JSON stored under
// `$CONFIG/shardx-launcher/fingerprints/<id>.json`.  The GPU select in
// the profile editor pulls its options from here — i.e. the user can
// curate which GPUs/devices show up by importing their own JSON files
// (or by deleting bundled ones).
//
// On first run we seed the directory with the bundled gpu presets so
// the launcher is usable out of the box.

use crate::store;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

/// One row in the library UI; also what the profile editor uses to
/// populate the GPU select.  `payload` is the verbatim FingerprintConfig
/// (without the `_meta` envelope launcher profiles use).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryEntry {
    pub id: String,
    pub label: String,
    pub platform: String,
    pub chrome: String,
    pub gpu: String,
    pub tag_color: String,
    /// True for the bundled starter set — UI marks them so the user
    /// knows they can re-seed by deleting/reimporting.
    #[serde(default)]
    pub builtin: bool,
    /// Full FingerprintConfig JSON.  Stored inline so the frontend can
    /// preview it and the profile editor can read derived fields
    /// (screen, platform, webgl) without a second round-trip.
    pub payload: Value,
}

fn safe_id(id: &str) -> Result<String> {
    if id.is_empty() || id.contains(['/', '\\']) || id.contains("..") {
        anyhow::bail!("invalid fingerprint id");
    }
    Ok(id.to_string())
}

fn path_for(id: &str) -> Result<PathBuf> {
    let id = safe_id(id)?;
    Ok(store::fingerprints_dir()?.join(format!("{id}.json")))
}

/// Seed the library with the bundled GPU presets on the first call
fn tag_color_for(platform: &str) -> String {
    match platform {
        "macOS" => "#8b5cf6".into(),
        "Windows" => "#5dade2".into(),
        "Linux" => "#4ade80".into(),
        // navigator.platform on a phone is "Linux armv8l", so a handset is
        // matched on the prefix rather than on equality.
        p if p.starts_with("Android") || p.starts_with("Linux arm") => "#fb923c".into(),
        _ => "#a78bfa".into(),
    }
}

pub fn list_all() -> Result<Vec<LibraryEntry>> {
    // Everything in
    //   $CONFIG/shardx-launcher/fingerprints/*.json
    // becomes a library entry, no matter how it got there — UI
    // imports, drag-and-drop, or the user dumping files in by hand.
    // The small iOS starter set is embedded below, so it is available offline
    // without changing or overwriting the user's downloaded library files.
    let dir = store::fingerprints_dir()?;
    let mut out = Vec::new();
    for entry in fs::read_dir(&dir)? {
        let entry = entry?;
        if store::is_os_litter(&entry.file_name()) || entry.path().extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        // One unreadable file must not take the whole library with it.
        let Ok(body) = fs::read_to_string(entry.path()) else { continue };
        // The file name is the entry's id: get and delete find it by that
        // name, and a copy made by hand keeps the id written inside it.
        let stem = entry.path().file_stem().and_then(|s| s.to_str()).map(String::from);
        if let Ok(mut e) = serde_json::from_str::<LibraryEntry>(&body) {
            if let Some(stem) = stem {
                e.id = stem;
            }
            out.push(e);
        } else if let Ok(payload) = serde_json::from_str::<Value>(&body) {
            // Bare FingerprintConfig (no LibraryEntry wrapper) — wrap on
            // the fly so user-imported files that came straight from
            // ShardX still show up.
            let id = entry
                .path()
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("imported")
                .to_string();
            out.push(wrap_payload(&id, &payload));
        }
    }
    let descriptor: Value = serde_json::from_str(include_str!("../../runtime.json"))?;
    let version = out.iter().find_map(|e| e.payload.pointer("/client_hints/brand_full_version").and_then(Value::as_str))
        .unwrap_or_else(|| descriptor["chromium_version"].as_str().unwrap_or("156.0.8078.48"));
    let builtins = ios_entries(version, &descriptor)?;
    for entry in builtins {
        if !out.iter().any(|e| e.id == entry.id) { out.push(entry); }
    }
    out.sort_by(|a, b| a.label.cmp(&b.label));
    Ok(out)
}

#[derive(Deserialize)]
struct IosDevice {
    id: String,
    name: String,
    platform: String,
    width: u32,
    height: u32,
    dpr: u32,
    refresh_rate: u32,
    chip: String,
    source: String,
    color_gamut: String,
    physical_width: u32,
    physical_height: u32,
    cpu_core_variants: Vec<u32>,
    gpu_core_variants: Vec<u32>,
    memory_gb_variants: Vec<f64>,
    simulation_defaults: Value,
    hardware_gpu: String,
    hardware_sources: Vec<String>,
}

/// Editable device-shaped presets, not captured Safari/WebKit fingerprints.
fn ios_entries(version: &str, descriptor: &Value) -> Result<Vec<LibraryEntry>> {
    let devices: Vec<IosDevice> = serde_json::from_str(include_str!("../presets/ios-devices.json"))?;
    let major = version.split('.').next().unwrap_or("156");
    Ok(devices.into_iter().map(|d| {
        let os = if d.platform == "iPad" { "CPU OS" } else { "CPU iPhone OS" };
        let ua = format!("Mozilla/5.0 ({}; {os} 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/{version} Mobile/15E148 Safari/604.1", d.platform);
        let payload = serde_json::json!({
            "name": d.name,
            "notes": format!("{} / {} / {}. CPU/RAM mô phỏng lấy từ bảng cấu hình phần cứng, có thể sửa. RAM {:?} GB; CPU {:?}; GPU {:?}. CHƯA có vân tay trình duyệt đo từ máy thật. Chạy bằng Chromium; UA/iOS 18/viewport là mô phỏng, không xác nhận hỗ trợ iOS 18 hay WebKit. Nguồn tham khảo: {:?}", d.name, d.chip, d.hardware_gpu, d.memory_gb_variants, d.cpu_core_variants, d.gpu_core_variants, d.hardware_sources),
            "device_catalog": {
                "chip": d.chip, "cpu_core_variants": d.cpu_core_variants,
                "gpu_core_variants": d.gpu_core_variants,
                "memory_gb_variants": d.memory_gb_variants,
                "simulation_defaults": d.simulation_defaults,
                "hardware_gpu": d.hardware_gpu, "hardware_sources": d.hardware_sources,
                "physical_width": d.physical_width, "physical_height": d.physical_height,
                "source": d.source, "fingerprint_status": "hardware_specs_only"
            },
            "timezone": "auto",
            "navigator": {
                "platform": "iOS", "platform_value": d.platform, "platform_version": "18.0.0",
                "user_agent": ua, "vendor": "Apple Computer, Inc.",
                "hardware_concurrency": d.simulation_defaults["hardware_concurrency"],
                "device_memory": d.simulation_defaults["device_memory"],
                "max_touch_points": 5, "language": "auto"
            },
            "client_hints": {
                "platform": "iOS", "platform_version": "18.0.0", "mobile": true,
                "model": d.name, "brand": "Google Chrome", "brand_version": major,
                "brand_full_version": version, "architecture": "arm", "bitness": "64"
            },
            "screen": {
                "width": d.width, "height": d.height, "avail_width": d.width, "avail_height": d.height,
                "avail_top": 0, "avail_left": 0, "device_pixel_ratio": d.dpr,
                "color_depth": 24, "pixel_depth": 24, "refresh_rate": d.refresh_rate, "color_gamut": d.color_gamut
            },
            "window": { "outer_width": d.width, "outer_height": d.height, "inner_width": d.width, "inner_height": d.height },
            "motion": { "enabled": true, "carry": "hand" },
            "tls": descriptor["tls"],
            "noise": {
                "canvas": { "enabled": false, "seed": 0 }, "webgl": { "enabled": false, "seed": 0, "intensity": 0 },
                "audio": { "enabled": false, "seed": 0 }, "fonts": { "enabled": false, "seed": 0 },
                "client_rects": { "enabled": false, "seed": 0, "max_offset": 0 }
            }
        });
        let mut entry = wrap_payload(&d.id, &payload);
        entry.builtin = true;
        entry
    }).collect())
}

#[cfg(test)]
mod ios_tests {
    use super::*;

    #[test]
    fn bundled_ios_devices_are_distinct_mobile_profiles() {
        let descriptor: Value = serde_json::from_str(include_str!("../../runtime.json")).unwrap();
        let entries = ios_entries("156.0.8078.48", &descriptor).unwrap();
        assert_eq!(entries.len(), 100);
        let ids: std::collections::HashSet<_> = entries.iter().map(|e| &e.id).collect();
        assert_eq!(ids.len(), entries.len());
        for e in &entries {
            assert!(e.builtin);
            assert_eq!(e.platform, "iOS");
            assert!(crate::space::profile::claims_mobile(e.payload.as_object().unwrap()));
            assert!(e.payload["screen"]["width"].as_u64().unwrap() > 0);
            assert!(e.payload["navigator"]["user_agent"].as_str().unwrap().contains("CriOS/156.0.8078.48"));
        }
        assert_eq!(entries.iter().filter(|e| e.payload["navigator"]["platform_value"] == "iPad").count(), 45);
        for e in &entries {
            assert!(e.payload["navigator"]["hardware_concurrency"].as_u64().unwrap() > 0);
            assert!(e.payload["navigator"]["device_memory"].as_f64().unwrap() > 0.0);
            assert!(e.payload.get("webgl").is_none());
            assert_eq!(e.payload["device_catalog"]["fingerprint_status"], "hardware_specs_only");
        }
    }
}

/// Pull a label / platform / chrome / GPU description out of a raw
/// FingerprintConfig.  Used both at import time and when listing
/// bare-JSON files in the library dir.
fn wrap_payload(id: &str, p: &Value) -> LibraryEntry {
    let label = p
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(id)
        .to_string();
    let platform = p
        .get("navigator")
        .and_then(|n| n.get("platform"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let chrome = p
        .get("client_hints")
        .and_then(|c| c.get("brand_version"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let gpu = p
        .get("webgl")
        .and_then(|w| w.get("renderer"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    LibraryEntry {
        id: id.to_string(),
        label,
        platform: platform.clone(),
        chrome,
        gpu,
        tag_color: tag_color_for(&platform),
        builtin: false,
        payload: p.clone(),
    }
}

pub fn get(id: &str) -> Result<Option<LibraryEntry>> {
    Ok(list_all()?.into_iter().find(|e| e.id == id))
}

/// Import a raw FingerprintConfig JSON.  Accepts the user's text and
/// returns the saved entry.  If `id` is empty a slug is derived from
/// `payload.name` (or a UUID if no name).
pub fn import(json_text: &str, id_hint: Option<String>) -> Result<LibraryEntry> {
    let payload: Value =
        serde_json::from_str(json_text).context("not a valid JSON FingerprintConfig")?;
    let raw_id = id_hint
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| {
            payload
                .get("name")
                .and_then(|v| v.as_str())
                .map(slugify)
                .unwrap_or_else(|| uuid::Uuid::new_v4().to_string())
        });
    let id = ensure_unique_id(&raw_id)?;
    let entry = wrap_payload(&id, &payload);
    let path = path_for(&id)?;
    fs::write(path, serde_json::to_string_pretty(&entry)?)?;
    Ok(entry)
}

fn slugify(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c.to_ascii_lowercase());
        } else if c == ' ' || c == '_' || c == '-' || c == '.' {
            out.push('-');
        }
    }
    let trimmed = out.trim_matches('-').to_string();
    if trimmed.is_empty() { uuid::Uuid::new_v4().to_string() } else { trimmed }
}

fn ensure_unique_id(base: &str) -> Result<String> {
    let dir = store::fingerprints_dir()?;
    if !dir.join(format!("{base}.json")).exists() {
        return Ok(base.into());
    }
    for n in 2..1000 {
        let cand = format!("{base}-{n}");
        if !dir.join(format!("{cand}.json")).exists() {
            return Ok(cand);
        }
    }
    Ok(format!("{base}-{}", uuid::Uuid::new_v4()))
}

pub fn delete(id: &str) -> Result<()> {
    let path = path_for(id)?;
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}
