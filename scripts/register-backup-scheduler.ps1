<#
.SYNOPSIS
    Registers a Windows Task Scheduler task that automatically creates a
    backup of Multi Account AI Control every day at the configured time.

.DESCRIPTION
    This script creates a scheduled task named "MAAC-AutoBackup" that calls
    the backup API endpoint via PowerShell's Invoke-RestMethod.

    The task runs daily at the specified hour WITHOUT requiring the Tauri
    desktop app to be open — it is a true OS-level daemon.

    Requirements:
    - Multi Account AI Control web server must be running (Next.js)
    - The web server must be accessible using the configured
      protocol/host/port (default: http://localhost:4173)
    - Windows PowerShell/PowerShell with Invoke-RestMethod available
    - Run this script as Administrator

.PARAMETER Hour
    Hour to run the daily backup (0-23). Default: 3 (3:00 AM)

.PARAMETER ExecutionTimeLimitMinutes
    Execution time limit for the scheduled backup task, in minutes.
    Default is 5 minutes. Increase this for larger backups.

.PARAMETER Port
    Port of the MAAC web server. Default: 4173

.PARAMETER Protocol
    Protocol used by the MAAC web server endpoint ("http" or "https").
    Default: http

.PARAMETER ServerHost
    Hostname or IP where the MAAC web server is reachable.
    Alias: Host
    Default: localhost

.PARAMETER Remove
    If specified, removes the scheduled task instead of creating it.

.EXAMPLE
    # Install with defaults (daily at 3 AM)
    ./register-backup-scheduler.ps1

    # Install with custom hour (daily at 2 AM)
    ./register-backup-scheduler.ps1 -Hour 2

    # Install using HTTPS endpoint
    ./register-backup-scheduler.ps1 -Protocol https

    # Install targeting a non-localhost server
    ./register-backup-scheduler.ps1 -Host 192.168.1.10 -Port 4173

    # Remove the scheduled task
    ./register-backup-scheduler.ps1 -Remove

.NOTES
    Task name: MAAC-AutoBackup
    The backup payload is stored in the app database (AppSetting key:
    "app.backup_schedule_log"), visible in the Data > Backups section.
    Optional authentication: set MAAC_BACKUP_TOKEN in the task user
    environment to send Authorization: Bearer <token> on backup calls.
    Endpoint settings are embedded into the scheduled task action at
    registration time (Protocol/Host/Port). If these values change later,
    run this script with -Remove and then register again with updated values.
#>

param(
    [ValidateRange(0, 23)]
    [int]$Hour = 3,

    [ValidateRange(1, 1440)]
    [int]$ExecutionTimeLimitMinutes = 5,

    [int]$Port = 4173,

    [ValidateSet('http', 'https')]
    [string]$Protocol = 'http',

    [Alias('Host')]
    [ValidateNotNullOrEmpty()]
    [string]$ServerHost = 'localhost',

    [switch]$Remove
)

$TaskName   = "MAAC-AutoBackup"
$TaskPath   = "\MAAC\"
$EventSource = "MAAC-AutoBackup"

# ── Require administrator privileges ───────────────────────────────────────────
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
$isAdministrator = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdministrator) {
    Write-Error "This script must be run as Administrator. Open PowerShell with 'Run as administrator' and try again."
    exit 1
}

# ── Remove existing task ───────────────────────────────────────────────────────
if ($Remove) {
    try {
        Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false -ErrorAction Stop
        Write-Host "[OK] Task '$TaskName' removed successfully." -ForegroundColor Green
    } catch {
        Write-Warning "Task '$TaskName' not found or could not be removed: $_"
    }
    exit 0
}

# ── Check for existing task ────────────────────────────────────────────────────
$existing = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -ErrorAction SilentlyContinue
if ($existing) {
    Write-Warning "Task '$TaskName' already exists. Use -Remove to unregister it first."
    exit 1
}

# ── Build the backup command ───────────────────────────────────────────────────
$ApiUrl = "${Protocol}://${ServerHost}:$Port/api/export/backup/schedule"

# ── Ensure the Event Log source exists (required before Write-EventLog can work) ─
try {
    if (-not [System.Diagnostics.EventLog]::SourceExists($EventSource)) {
        New-EventLog -LogName Application -Source $EventSource -ErrorAction Stop
        Write-Host "  [OK] Event Log source '$EventSource' registered." -ForegroundColor Green
    }
} catch {
    Write-Warning "Could not register Event Log source '$EventSource': $_"
    Write-Warning "Event logging inside the scheduled task may fail silently."
}

# ── Build the script block that runs inside the scheduled task ─────────────────
$ScriptBlock = @"
try {
    `$label = "Auto-backup (OS scheduler) `$(Get-Date -Format 'yyyy-MM-dd')"
    `$body  = ConvertTo-Json @{ label = `$label }

    # Optional authentication: set MAAC_BACKUP_TOKEN in the task/user environment.
    `$token = [Environment]::GetEnvironmentVariable('MAAC_BACKUP_TOKEN')
    `$headers = @{}
    if (`$token) {
        `$headers['Authorization'] = "Bearer `$token"
    } else {
        Write-EventLog -LogName Application -Source '$EventSource' -EntryType Warning -EventId 1002 -Message "Backup request sent without authentication token (MAAC_BACKUP_TOKEN not set)." -ErrorAction SilentlyContinue
    }

    Invoke-RestMethod -Method Post -Uri '$ApiUrl' -Headers `$headers -Body `$body -ContentType 'application/json' -ErrorAction Stop
    Write-EventLog -LogName Application -Source '$EventSource' -EntryType Information -EventId 1000 -Message "Backup created: `$label" -ErrorAction SilentlyContinue
} catch {
    `$ex = `$_.Exception
    `$msg = "Backup failed: `$(`$ex.GetBaseException().Message)"

    if (`$ex.Response -and `$ex.Response.StatusCode) {
        `$statusCode = [int]`$ex.Response.StatusCode
        `$statusText = `$ex.Response.StatusDescription
        `$msg += " | HTTP `$statusCode `$statusText"

        try {
            `$stream = `$ex.Response.GetResponseStream()
            if (`$stream) {
                `$reader = New-Object System.IO.StreamReader(`$stream)
                `$responseBody = `$reader.ReadToEnd()
                if (`$responseBody) {
                    `$msg += " | Response: `$responseBody"
                }
            }
        } catch {
            # Ignore response-body read errors to preserve original failure logging.
        }
    }

    Write-EventLog -LogName Application -Source '$EventSource' -EntryType Warning -EventId 1001 -Message `$msg -ErrorAction SilentlyContinue
}
"@

$EncodedScript = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($ScriptBlock))

# ── Create the scheduled task ──────────────────────────────────────────────────
$Action  = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -WindowStyle Hidden -EncodedCommand $EncodedScript"

$Trigger = New-ScheduledTaskTrigger -Daily -At "${Hour}:00"

$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes $ExecutionTimeLimitMinutes) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$true `
    -MultipleInstances IgnoreNew

# S4U (Service For User): runs without storing the user's password in Task Scheduler.
# Requires the user to have logged in interactively at least once on this machine;
# otherwise the task may register successfully but fail at runtime with a
# Task Scheduler logon/start failure (check Task Scheduler History / Last Run Result).
# Verification/remediation: sign in once interactively as "$env:USERDOMAIN\$env:USERNAME",
# then run this script again (or re-run the task) so S4U has the required local logon context.
# This avoids credential storage for improved security.
# Runtime dependency note: the scheduled task only succeeds if the MAAC web server
# is reachable at $ApiUrl at execution time. If the server is down/unreachable or
# starts requiring authentication, the POST request fails and no backup is created.
# Failures are recorded in Application Event Log (source: $EventSource).
$Principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType S4U `
    -RunLevel Highest

try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -TaskPath $TaskPath `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -Principal $Principal `
        -Description "Daily automatic backup of Multi Account AI Control (MAAC). Calls POST $ApiUrl every day at ${Hour}:00." `
        -ErrorAction Stop | Out-Null

    Write-Host "" -ForegroundColor Green
    Write-Host "  [OK] Task '$TaskName' registered successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Schedule  : Daily at ${Hour}:00" -ForegroundColor Cyan
    Write-Host "  Endpoint  : $ApiUrl" -ForegroundColor Cyan
    Write-Host "  Task Path : $TaskPath$TaskName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  NOTE: The MAAC web server must be running for the backup to succeed." -ForegroundColor Yellow
    Write-Host "        Backups appear in Data > Backups in the app." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  To remove: .\register-backup-scheduler.ps1 -Remove" -ForegroundColor DarkGray
    Write-Host ""

} catch {
    Write-Error "Failed to register scheduled task: $_"
    exit 1
}
