use std::{fs, io, path::Path};

/// Refuse to replace a Windows executable still mapped by another process.
pub fn check_engine_idle(binary: &Path) -> io::Result<()> {
    if !binary.exists() { return Ok(()); }
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        fs::OpenOptions::new().read(true).share_mode(0).open(binary)?;
    }
    Ok(())
}

/// The archive has already been unpacked and checked. Move the old tree aside
/// before publishing the new one; never extract over the active installation.
pub fn publish(base: &Path, staging: &Path, root: &str) -> io::Result<()> {
    let new = staging.join(root);
    if !new.is_dir() { return Err(io::Error::new(io::ErrorKind::NotFound, "Engine archive has no expected runtime directory")); }
    let live = base.join(root);
    let backup = staging.join("previous-engine");
    let had_previous = live.exists();
    if had_previous { fs::rename(&live, &backup)?; }
    if let Err(error) = fs::rename(&new, &live) {
        if had_previous {
            fs::rename(&backup, &live).map_err(|restore| io::Error::other(format!("Engine update failed ({error}); restore failed ({restore}). Previous engine remains at {}", backup.display())))?;
        }
        return Err(error);
    }
    // Old files are no longer active. A scanner holding a backup does not
    // invalidate the successfully installed runtime; keep it for later cleanup.
    if had_previous { let _ = fs::remove_dir_all(&backup); }
    let _ = fs::remove_dir(staging);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn publish_replaces_complete_tree_and_preserves_old_when_staging_is_missing() {
        let dir = std::env::temp_dir().join(format!("shard-runtime-{}-{}", std::process::id(), SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
        fs::create_dir_all(dir.join("engine")).unwrap();
        fs::write(dir.join("engine/old.dll"), "old").unwrap();
        fs::create_dir_all(dir.join("stage")).unwrap();
        assert!(publish(&dir, &dir.join("stage"), "engine").is_err());
        assert!(dir.join("engine/old.dll").exists());
        fs::create_dir_all(dir.join("stage/engine")).unwrap();
        fs::write(dir.join("stage/engine/new.dll"), "new").unwrap();
        publish(&dir, &dir.join("stage"), "engine").unwrap();
        assert!(!dir.join("engine/old.dll").exists());
        assert!(dir.join("engine/new.dll").exists());
        fs::remove_dir_all(dir).unwrap();
    }

    #[cfg(windows)]
    #[test]
    fn detects_a_file_held_by_another_process_or_handle() {
        let path = std::env::temp_dir().join(format!("shard-runtime-lock-{}.exe", std::process::id()));
        fs::write(&path, "test").unwrap();
        let held = fs::File::open(&path).unwrap();
        assert!(check_engine_idle(&path).is_err());
        drop(held);
        assert!(check_engine_idle(&path).is_ok());
        fs::remove_file(path).unwrap();
    }
}
