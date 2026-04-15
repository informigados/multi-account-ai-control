<#
.SYNOPSIS
    Registers a Windows Task Scheduler task that automatically creates a
    backup of Multi Account AI Control every day at the configured time.

.DESCRIPTION
    This script creates a scheduled task named "MAAC-AutoBackup" that calls
    the backup API endpoint via curl (built-in since Windows 10 1803).

    The task runs daily at the specified hour WITHOUT requiring the Tauri
    desktop app to be open — it is a true OS-level daemon.

    Requirements:
    - Multi Account AI Control web server must be running (Next.js)
    - The web server must be accessible at http://localhost:4173
    - Windows 10 1803+ or Windows Server 2019+ (for built-in curl)
    - Run this script as Administrator

.PARAMETER Hour
    Hour to run the daily backup (0-23). Default: 3 (3:00 AM)

.PARAMETER Port
    Port of the MAAC web server. Default: 4173

.PARAMETER Remove
    If specified, removes the scheduled task instead of creating it.

.EXAMPLE
    # Install with defaults (daily at 3 AM)
    ./register-backup-scheduler.ps1

    # Install with custom hour (daily at 2 AM)
    ./register-backup-scheduler.ps1 -Hour 2

    # Remove the scheduled task
    ./register-backup-scheduler.ps1 -Remove

.NOTES
    Task name: MAAC-AutoBackup
    The backup payload is stored in the app database (AppSetting key:
    "app.backup_schedule_log"), visible in the Data > Backups section.
#>

param(
    [ValidateRange(0, 23)]
    [int]$Hour = 3,

    [int]$Port = 4173,

    [switch]$Remove
)

$TaskName = "MAAC-AutoBackup"
$TaskPath = "\MAAC\"

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
$ApiUrl = "http://127.0.0.1:$Port/api/export/backup/schedule"
$Date   = '$(Get-Date -Format yyyy-MM-dd)'

# Use PowerShell to call the API (curl alternative that works reliably)
$ScriptBlock = @"
try {
    `$label = "Auto-backup (OS scheduler) `$(Get-Date -Format 'yyyy-MM-dd')"
    `$body  = ConvertTo-Json @{ label = `$label }
    Invoke-RestMethod -Method Post -Uri '$ApiUrl' -Body `$body -ContentType 'application/json' -ErrorAction Stop
    Write-EventLog -LogName Application -Source 'MAAC-AutoBackup' -EntryType Information -EventId 1000 -Message "Backup created: `$label" -ErrorAction SilentlyContinue
} catch {
    Write-EventLog -LogName Application -Source 'MAAC-AutoBackup' -EntryType Warning -EventId 1001 -Message "Backup failed: `$_" -ErrorAction SilentlyContinue
}
"@

$EncodedScript = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($ScriptBlock))

# ── Create the scheduled task ──────────────────────────────────────────────────
$Action  = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -WindowStyle Hidden -EncodedCommand $EncodedScript"

$Trigger = New-ScheduledTaskTrigger -Daily -At "${Hour}:00"

$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false `
    -MultipleInstances IgnoreNew

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
