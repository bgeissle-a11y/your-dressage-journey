# YDJ Backblaze B2 Backup — Implementation Brief

**Created:** April 22, 2026
**Target:** Claude Code (VS Code) handoff
**Goal:** Automated daily encrypted backup of the YDJ project folder to Backblaze B2 using rclone

---

## Overview

Set up rclone on Windows to run a nightly encrypted sync of `C:\Users\bgeis\your-dressage-journey\` to a private B2 bucket. The sync uses rclone's `crypt` remote layered over B2, so filenames and contents are encrypted before leaving the machine. A B2 lifecycle rule keeps 30 days of prior-version history so accidental deletions can be recovered.

**Architecture:**

```
Local folder ─► rclone ─► ydj-secure (crypt) ─► b2-ydj (B2) ─► Private bucket
                              │                       │
                       encrypts filenames    uploads encrypted blobs
                       and contents          to Backblaze
```

---

## Prerequisites

Already complete:
- [x] Backblaze account created
- [x] Private B2 bucket created
- [x] Application Key scoped to the bucket (keyID + applicationKey stored in password manager)
- [x] rclone download in progress

To collect before starting — Claude Code should ask Barb for these:
- Bucket name (e.g., `ydj-backup`)
- B2 keyID
- B2 applicationKey
- New encryption passphrase (Barb to generate via password manager, strong random string)
- New salt password (Barb to generate via password manager, separate from above)

**Critical:** Save the encryption passphrase AND salt password to the password manager BEFORE running `rclone config`. If either is lost, backups are unrecoverable by design (zero-knowledge encryption).

---

## Phase 1: Install rclone

### 1.1 Extract rclone

Assuming the ZIP is in Downloads:

```powershell
# Create install directory
New-Item -ItemType Directory -Force -Path "C:\rclone"

# Extract (wildcard matches whatever version was downloaded)
Expand-Archive -Path "$env:USERPROFILE\Downloads\rclone-*-windows-amd64.zip" -DestinationPath "$env:TEMP\rclone-extract" -Force

# Copy rclone.exe to C:\rclone
Copy-Item -Path "$env:TEMP\rclone-extract\rclone-*-windows-amd64\rclone.exe" -Destination "C:\rclone\rclone.exe" -Force
```

### 1.2 Add rclone to user PATH

```powershell
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*C:\rclone*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;C:\rclone", "User")
    Write-Host "Added C:\rclone to user PATH. Close and reopen your terminal." -ForegroundColor Green
} else {
    Write-Host "C:\rclone already in PATH." -ForegroundColor Yellow
}
```

### 1.3 Verify installation

**Close and reopen the terminal**, then:

```powershell
rclone version
```

Expected: rclone prints version info. If "command not found," PATH didn't refresh — close and reopen terminal once more.

---

## Phase 2: Configure rclone remotes

Run:

```powershell
rclone config
```

This is interactive. Exact prompt wording may vary slightly by rclone version, but the answers are:

### 2.1 Create B2 base remote

At the menu, choose `n` (new remote).

| Prompt | Answer |
|---|---|
| name | `b2-ydj` |
| Storage | Find "Backblaze B2" in the numbered list; enter that number (or type `b2`) |
| account | *[paste keyID]* |
| key | *[paste applicationKey]* |
| hard_delete | leave blank (default `false`) — we want soft-delete so the lifecycle rule can retain versions |
| Edit advanced config? | `n` |
| Keep this "b2-ydj" remote? | `y` |

Returns to main menu.

### 2.2 Create crypt remote (encryption layer)

At the menu, choose `n` again.

| Prompt | Answer |
|---|---|
| name | `ydj-secure` |
| Storage | Find "Encrypt/Decrypt a remote"; enter that number (or type `crypt`) |
| remote | `b2-ydj:<BUCKET_NAME>/encrypted` (e.g., `b2-ydj:ydj-backup/encrypted`) |
| filename_encryption | `1` (standard) |
| directory_name_encryption | `1` (true) |
| Password or key derivation | Choose to type own password, paste passphrase twice |
| Salt password | Choose to type own salt password, paste twice |
| Edit advanced config? | `n` |
| Keep this "ydj-secure" remote? | `y` |

Quit config with `q`.

### 2.3 Back up the rclone config — **DO NOT SKIP**

Critical recovery step:

```powershell
rclone config show b2-ydj
rclone config show ydj-secure
```

Copy both outputs into the password manager as a secure note titled "YDJ rclone config backup." This output plus the passphrase and salt password are everything needed to restore backups on a new machine.

Also make a file-level copy of the config:

```powershell
Copy-Item "$env:APPDATA\rclone\rclone.conf" "$env:APPDATA\rclone\rclone.conf.backup"
```

---

## Phase 3: Create backup script and excludes

### 3.1 Create `C:\rclone\ydj-excludes.txt`

Exact contents (preserve order and wildcards):

```
node_modules/**
functions/node_modules/**
.firebase/**
dist/**
build/**
out/**
.next/**
.cache/**
*.log
.DS_Store
Thumbs.db
desktop.ini
```

### 3.2 Create `C:\rclone\ydj-backup.bat`

Exact contents:

```bat
@echo off
set LOGFILE=C:\rclone\ydj-backup.log
echo. >> %LOGFILE%
echo ===== BACKUP RUN: %date% %time% ===== >> %LOGFILE%
rclone sync "C:\Users\bgeis\your-dressage-journey" ydj-secure: ^
  --exclude-from "C:\rclone\ydj-excludes.txt" ^
  --log-file %LOGFILE% ^
  --log-level INFO ^
  --transfers 8 ^
  --checkers 16
echo ===== END RUN: %date% %time% (exit %ERRORLEVEL%) ===== >> %LOGFILE%
```

---

## Phase 4: Dry-run, then first full backup

### 4.1 Dry-run (no actual upload)

```powershell
rclone sync "C:\Users\bgeis\your-dressage-journey" ydj-secure: --exclude-from "C:\rclone\ydj-excludes.txt" --dry-run --verbose
```

Review the output — confirm:
- `node_modules` is **NOT** listed
- `.html`, `.js`, `.jsx`, `.md`, `.json` project files **ARE** listed
- `.env` and `.env.local` **ARE** listed (contents will be encrypted before upload)
- `.git` contents **ARE** listed (preserves uncommitted work + stashes)
- `dressage tests/comprehensive_dressage_test_database_with_coefficients.json` **IS** listed

If the exclude list needs adjusting, edit `ydj-excludes.txt` and re-run the dry-run.

### 4.2 First real backup

```powershell
C:\rclone\ydj-backup.bat
```

First run uploads everything and may take a while depending on size. Monitor progress in another terminal:

```powershell
Get-Content C:\rclone\ydj-backup.log -Wait -Tail 20
```

Confirm the log shows `END RUN` with `exit 0`.

---

## Phase 5: Configure lifecycle rule in Backblaze (manual — web console)

**Claude Code cannot do this step — Barb must do it in the Backblaze web UI.**

1. Log in to Backblaze → **Buckets** → click the YDJ bucket.
2. Click **Lifecycle Settings**.
3. Choose **"Keep prior versions for this number of days"** → set to **30**.
4. Save.

This means: when rclone "deletes" or overwrites a file in the bucket (because it changed or was removed locally), B2 hides the old version for 30 days instead of purging it. Protects against accidental deletions, overwrites, and ransomware scenarios.

---

## Phase 6: Schedule the daily backup

In PowerShell:

```powershell
$action = New-ScheduledTaskAction -Execute "C:\rclone\ydj-backup.bat"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 10) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 4)
Register-ScheduledTask `
    -TaskName "YDJ-Backup" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Daily rclone backup of YDJ project to Backblaze B2"
```

Verify it exists:

```powershell
Get-ScheduledTask -TaskName "YDJ-Backup"
```

Force an immediate test run:

```powershell
Start-ScheduledTask -TaskName "YDJ-Backup"
```

Wait ~30 seconds, then confirm it ran:

```powershell
Get-Content C:\rclone\ydj-backup.log -Tail 20
```

**Note:** With `-StartWhenAvailable`, if the laptop is asleep at 2 AM, the task runs when it wakes. Task runs under Barb's user account while logged in — sufficient for a single-laptop setup. If backups-while-logged-off become important later, that's a Phase 8 enhancement (requires stored credentials).

---

## Phase 7: Test restore (required before trusting the backup)

### 7.1 Single-file restore

```powershell
New-Item -ItemType Directory -Force -Path "C:\temp\restore-test"
rclone copy "ydj-secure:/YDJ_Reflection_System_Brief.md" "C:\temp\restore-test\"
Get-Content "C:\temp\restore-test\YDJ_Reflection_System_Brief.md" | Select-Object -First 20
```

Confirm file content matches the original.

### 7.2 List bucket contents (decrypted view)

```powershell
rclone ls ydj-secure: | Select-Object -First 30
```

Shows decrypted filenames — confirms the crypt remote can read its own data.

### 7.3 Raw B2 view (confirms encryption is working)

```powershell
rclone ls b2-ydj:<BUCKET_NAME>/encrypted | Select-Object -First 10
```

Filenames here should be unintelligible gibberish. If you see plain filenames, encryption is misconfigured — stop and fix before continuing.

### 7.4 Clean up test

```powershell
Remove-Item -Recurse -Force "C:\temp\restore-test"
```

---

## Post-setup checklist

- [ ] `rclone version` returns a valid version
- [ ] `rclone config show b2-ydj` and `rclone config show ydj-secure` both return content
- [ ] Encryption passphrase + salt password saved in password manager
- [ ] Output of `rclone config show ydj-secure` saved in password manager
- [ ] `rclone.conf.backup` file created
- [ ] Dry-run output reviewed and approved
- [ ] First full backup completed successfully (exit 0)
- [ ] Raw B2 view shows encrypted/gibberish filenames
- [ ] Lifecycle rule set to 30 days in Backblaze console
- [ ] Scheduled task "YDJ-Backup" created
- [ ] Manual test-run of scheduled task succeeded
- [ ] Test restore verified file contents match

---

## Ongoing maintenance cadence

**Weekly:** Glance at `C:\rclone\ydj-backup.log` — confirm recent runs exited 0.

```powershell
Get-Content C:\rclone\ydj-backup.log -Tail 30
```

**Monthly:** Check bucket storage usage in the Backblaze console. Expect well under $1/mo for a project this size. Investigate if usage jumps unexpectedly.

**Quarterly:** Run a full restore drill — restore a handful of files to a scratch folder, confirm contents, delete scratch folder. A backup untested for 90 days is a backup you can't trust.

**If machine is replaced:**
1. Install rclone on new machine (Phase 1).
2. Copy `rclone.conf.backup` to `$env:APPDATA\rclone\rclone.conf` on the new machine.
3. Run `rclone lsd ydj-secure:` to confirm access.
4. If the config file is unavailable, rebuild both remotes from saved keyID + applicationKey + passphrase + salt password in the password manager.

---

## Out of scope

- Whole-disk or system-level backup — this covers only the YDJ project folder
- Firestore/Firebase database backup — separate concern, not covered here
- Backup of the GitHub repository itself — GitHub is the existing source-code backup
- Backups running while Barb is logged off — current config requires an active user session (runs on next login if missed)
- Separate archive format (tar, 7z) — rclone's crypt remote handles per-file encryption; no additional archiving layer
- Monitoring/alerting on backup failures — Phase 8 enhancement if desired later (options: email on failure via PowerShell, or a healthchecks.io ping)
- Migrating existing files in the bucket if any test uploads are already there — start with a clean `encrypted/` prefix

---

## Troubleshooting quick reference

| Symptom | Likely cause | Fix |
|---|---|---|
| `rclone: command not found` after install | PATH not refreshed | Close and reopen terminal |
| `401 Unauthorized` on B2 operations | Wrong keyID/applicationKey, or key scope doesn't include this bucket | Re-run `rclone config`, update `b2-ydj` remote with correct credentials |
| Dry-run shows `node_modules` | Exclude file not found | Verify `C:\rclone\ydj-excludes.txt` exists and path in `.bat` is correct |
| Scheduled task never runs | Laptop asleep at trigger time + no login between triggers | `-StartWhenAvailable` should handle; check Task Scheduler history tab for errors |
| Files upload but restore fails to decrypt | Passphrase or salt mismatch | Verify via `rclone config show ydj-secure` against password manager copy |
| Bucket shows plaintext filenames | Uploading to `b2-ydj` directly instead of `ydj-secure` | All backup commands must use `ydj-secure:` as destination |

