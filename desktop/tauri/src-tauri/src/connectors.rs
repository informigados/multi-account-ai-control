//! Local session connectors for popular AI providers.
//! Each connector reads the provider's credential files from the local machine.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetectedAccount {
    pub identifier: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    #[serde(rename = "planName")]
    pub plan_name: Option<String>,
    #[serde(rename = "tokenPreview")]
    pub token_preview: Option<String>,
    #[serde(rename = "providerSlug")]
    pub provider_slug: String,
}

/// Masks a token, showing only the first 6 characters.
fn mask_token(token: &str) -> String {
    if token.len() > 6 {
        format!("{}…", &token[..6])
    } else {
        "••••••".to_string()
    }
}

// ─── Gemini CLI ──────────────────────────────────────────────────────────────

pub fn detect_gemini() -> Option<DetectedAccount> {
    let path = dirs::home_dir()?.join(".gemini").join("oauth_creds.json");
    if !path.exists() {
        return None;
    }
    let raw = std::fs::read_to_string(&path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&raw).ok()?;

    let identifier = json
        .get("email")
        .or_else(|| json.get("user_email"))
        .or_else(|| json.get("sub"))
        .and_then(|v| v.as_str())
        .unwrap_or("gemini-user")
        .to_string();

    let token_preview = json
        .get("access_token")
        .and_then(|v| v.as_str())
        .map(mask_token);

    Some(DetectedAccount {
        identifier: identifier.clone(),
        display_name: identifier,
        plan_name: None,
        token_preview,
        provider_slug: "gemini-cli".to_string(),
    })
}

// ─── OpenAI Codex ─────────────────────────────────────────────────────────────

pub fn detect_codex() -> Option<DetectedAccount> {
    let path = dirs::home_dir()?.join(".codex").join("auth.json");
    if !path.exists() {
        return None;
    }
    let raw = std::fs::read_to_string(&path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&raw).ok()?;

    let identifier = json
        .get("email")
        .or_else(|| json.get("username"))
        .and_then(|v| v.as_str())
        .unwrap_or("codex-user")
        .to_string();

    let token_preview = json
        .get("api_key")
        .or_else(|| json.get("token"))
        .and_then(|v| v.as_str())
        .map(mask_token);

    Some(DetectedAccount {
        identifier: identifier.clone(),
        display_name: identifier,
        plan_name: json.get("plan").and_then(|v| v.as_str()).map(String::from),
        token_preview,
        provider_slug: "codex".to_string(),
    })
}

// ─── Zed Editor ───────────────────────────────────────────────────────────────

fn zed_config_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        dirs::config_dir().map(|p| p.join("Zed").join("accounts.json"))
    }
    #[cfg(target_os = "macos")]
    {
        dirs::home_dir().map(|p| {
            p.join("Library")
                .join("Application Support")
                .join("Zed")
                .join("accounts.json")
        })
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        dirs::config_dir().map(|p| p.join("zed").join("accounts.json"))
    }
}

pub fn detect_zed() -> Option<DetectedAccount> {
    let path = zed_config_path()?;
    if !path.exists() {
        return None;
    }
    let raw = std::fs::read_to_string(&path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&raw).ok()?;

    // Zed stores an array of accounts; take the first signed-in one
    let account = if json.is_array() {
        json.as_array()?.first()?.clone()
    } else {
        json
    };

    let identifier = account
        .get("email")
        .or_else(|| account.get("github_login"))
        .and_then(|v| v.as_str())
        .unwrap_or("zed-user")
        .to_string();

    let token_preview = account
        .get("access_token")
        .and_then(|v| v.as_str())
        .map(mask_token);

    Some(DetectedAccount {
        identifier: identifier.clone(),
        display_name: account
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or(&identifier)
            .to_string(),
        plan_name: account
            .get("plan")
            .and_then(|v| v.as_str())
            .map(String::from),
        token_preview,
        provider_slug: "zed".to_string(),
    })
}

// ─── Cursor ───────────────────────────────────────────────────────────────────

fn cursor_state_db_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        dirs::config_dir().map(|p| {
            p.join("Cursor")
                .join("User")
                .join("globalStorage")
                .join("state.vscdb")
        })
    }
    #[cfg(target_os = "macos")]
    {
        dirs::home_dir().map(|p| {
            p.join("Library")
                .join("Application Support")
                .join("Cursor")
                .join("User")
                .join("globalStorage")
                .join("state.vscdb")
        })
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        dirs::config_dir().map(|p| {
            p.join("Cursor")
                .join("User")
                .join("globalStorage")
                .join("state.vscdb")
        })
    }
}

pub fn detect_cursor() -> Option<DetectedAccount> {
    let db_path = cursor_state_db_path()?;
    if !db_path.exists() {
        return None;
    }

    // Read SQLite using rusqlite if available; fallback gracefully
    #[cfg(feature = "sqlite")]
    {
        use rusqlite::Connection;
        let conn = Connection::open_with_flags(
            &db_path,
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )
        .ok()?;

        let mut stmt = conn
            .prepare("SELECT value FROM ItemTable WHERE key LIKE '%cursorAuth%email%' OR key = 'cursorAuth/cachedEmail' LIMIT 1")
            .ok()?;

        let email: String = stmt
            .query_row([], |row| row.get(0))
            .ok()?;

        return Some(DetectedAccount {
            identifier: email.clone(),
            display_name: email,
            plan_name: None,
            token_preview: None,
            provider_slug: "cursor".to_string(),
        });
    }

    #[cfg(not(feature = "sqlite"))]
    {
        // Without rusqlite, we cannot read the SQLite file directly.
        // Return a placeholder indicating the file exists but needs the sqlite feature.
        Some(DetectedAccount {
            identifier: "cursor-user@local".to_string(),
            display_name: "Cursor (found state.vscdb)".to_string(),
            plan_name: None,
            token_preview: None,
            provider_slug: "cursor".to_string(),
        })
    }
}
// ─── GitHub Copilot ───────────────────────────────────────────────────────────
//
// Copilot stores its non-sensitive identity in:
//   Windows: %LOCALAPPDATA%\github-copilot\hosts.json
//   macOS:   ~/.config/github-copilot/hosts.json
//   Linux:   ~/.config/github-copilot/hosts.json
//
// The actual OAuth token is encrypted by the OS keychain and is NOT accessible
// without elevated keychain permissions (safe-storage). We return only the
// identity (user login) extracted from hosts.json, which is plaintext JSON.
// The tokenPreview is intentionally omitted (None) to avoid keychain access.

fn copilot_hosts_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        dirs::data_local_dir().map(|p| p.join("github-copilot").join("hosts.json"))
    }
    #[cfg(not(target_os = "windows"))]
    {
        dirs::config_dir().map(|p| p.join("github-copilot").join("hosts.json"))
    }
}

pub fn detect_copilot() -> Option<DetectedAccount> {
    let path = copilot_hosts_path()?;
    if !path.exists() {
        return None;
    }
    let raw = std::fs::read_to_string(&path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&raw).ok()?;

    // hosts.json structure:  { "github.com": { "user": "username", "oauth_token": "<encrypted>" } }
    let github_entry = json.get("github.com")?;

    let identifier = github_entry
        .get("user")
        .and_then(|v| v.as_str())
        .unwrap_or("github-copilot-user")
        .to_string();

    Some(DetectedAccount {
        identifier: format!("{}@github", identifier),
        display_name: identifier,
        plan_name: None,
        // OAuth token is OS-keychain encrypted — do not attempt to read it
        token_preview: Some("(via OS keychain — secured)".to_string()),
        provider_slug: "github-copilot".to_string(),
    })
}

// ─── Windsurf ─────────────────────────────────────────────────────────────────
//
// Windsurf (Codeium) uses the same storage pattern as VS Code / Cursor:
//   Windows: %APPDATA%\Windsurf\User\globalStorage\state.vscdb
//   macOS:   ~/Library/Application Support/Windsurf/User/globalStorage/state.vscdb
//   Linux:   ~/.config/Windsurf/User/globalStorage/state.vscdb
//
// The SQLite DB is read only when the `sqlite` feature is enabled.

fn windsurf_state_db_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        dirs::config_dir().map(|p| {
            p.join("Windsurf")
                .join("User")
                .join("globalStorage")
                .join("state.vscdb")
        })
    }
    #[cfg(target_os = "macos")]
    {
        dirs::home_dir().map(|p| {
            p.join("Library")
                .join("Application Support")
                .join("Windsurf")
                .join("User")
                .join("globalStorage")
                .join("state.vscdb")
        })
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        dirs::config_dir().map(|p| {
            p.join("Windsurf")
                .join("User")
                .join("globalStorage")
                .join("state.vscdb")
        })
    }
}

pub fn detect_windsurf() -> Option<DetectedAccount> {
    let db_path = windsurf_state_db_path()?;
    if !db_path.exists() {
        return None;
    }

    #[cfg(feature = "sqlite")]
    {
        use rusqlite::Connection;
        let conn = Connection::open_with_flags(
            &db_path,
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )
        .ok()?;

        // Windsurf / Codeium typically stores email under codeium.auth or windsurf.auth keys
        let mut stmt = conn
            .prepare(
                "SELECT value FROM ItemTable WHERE key LIKE '%codeium%email%' OR key LIKE '%windsurf%email%' LIMIT 1",
            )
            .ok()?;

        let email: String = stmt.query_row([], |row| row.get(0)).ok()?;

        return Some(DetectedAccount {
            identifier: email.clone(),
            display_name: email,
            plan_name: None,
            token_preview: None,
            provider_slug: "windsurf".to_string(),
        });
    }

    #[cfg(not(feature = "sqlite"))]
    {
        Some(DetectedAccount {
            identifier: "windsurf-user@local".to_string(),
            display_name: "Windsurf (found state.vscdb)".to_string(),
            plan_name: None,
            token_preview: None,
            provider_slug: "windsurf".to_string(),
        })
    }
}

// ─── Multiple accounts support ───────────────────────────────────────────────
//
// Returns a Vec<DetectedAccount> instead of Option<DetectedAccount>.
// For Zed, which natively stores multiple accounts; for others returns 0 or 1.

pub fn detect_zed_multiple() -> Vec<DetectedAccount> {
    let path = match zed_config_path() {
        Some(p) => p,
        None => return vec![],
    };
    if !path.exists() {
        return vec![];
    }
    let raw = match std::fs::read_to_string(&path) {
        Ok(r) => r,
        Err(_) => return vec![],
    };
    let json: serde_json::Value = match serde_json::from_str(&raw) {
        Ok(v) => v,
        Err(_) => return vec![],
    };

    let accounts_arr = if json.is_array() {
        json.as_array().cloned().unwrap_or_default()
    } else {
        vec![json]
    };

    accounts_arr
        .iter()
        .filter_map(|account| {
            let identifier = account
                .get("email")
                .or_else(|| account.get("github_login"))
                .and_then(|v| v.as_str())
                .unwrap_or("zed-user")
                .to_string();

            let token_preview = account
                .get("access_token")
                .and_then(|v| v.as_str())
                .map(mask_token);

            Some(DetectedAccount {
                identifier: identifier.clone(),
                display_name: account
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or(&identifier)
                    .to_string(),
                plan_name: account
                    .get("plan")
                    .and_then(|v| v.as_str())
                    .map(String::from),
                token_preview,
                provider_slug: "zed".to_string(),
            })
        })
        .collect()
}
