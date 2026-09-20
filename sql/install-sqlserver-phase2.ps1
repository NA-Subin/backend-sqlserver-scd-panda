# Run this in an ELEVATED PowerShell (Right-click PowerShell -> Run as Administrator).
# The setup media already finished downloading to
# C:\Users\msi\Downloads\SQLServer2025-x64-ENU-StdDev.iso - this just mounts
# it and runs the real setup.exe with the unattended Database-Engine-only
# install (Mixed Mode auth + sa password + TCP/IP enabled).

$iso = "C:\Users\msi\Downloads\SQLServer2025-x64-ENU-StdDev.iso"
$saPassword = "YourStrong!Passw0rd"   # change this if you want a different sa password

if (-not (Test-Path $iso)) {
    Write-Error "Can't find $iso - the Phase 1 download didn't complete."
    exit 1
}

Write-Host "=== Mounting ISO ==="
$mount = Mount-DiskImage -ImagePath $iso -PassThru
$driveLetter = ($mount | Get-Volume).DriveLetter
if (-not $driveLetter) {
    Write-Error "Mount failed - is this PowerShell actually running elevated?"
    exit 1
}
Write-Host "Mounted at ${driveLetter}:"

$setupExe = "${driveLetter}:\setup.exe"
if (-not (Test-Path $setupExe)) {
    Write-Error "setup.exe not found at $setupExe"
    Dismount-DiskImage -ImagePath $iso
    exit 1
}

Write-Host "=== Installing Database Engine (unattended) - this part takes a few minutes ==="
$p = Start-Process -FilePath $setupExe -ArgumentList `
    "/ACTION=Install", "/QUIET", "/IACCEPTSQLSERVERLICENSETERMS", `
    "/FEATURES=SQLEngine", `
    "/INSTANCENAME=MSSQLSERVER", `
    "/SECURITYMODE=SQL", "/SAPWD=$saPassword", `
    "/SQLSYSADMINACCOUNTS=`"BUILTIN\Administrators`"", `
    "/TCPENABLED=1" `
    -Wait -PassThru
Write-Host "Setup exit code: $($p.ExitCode)"

Dismount-DiskImage -ImagePath $iso | Out-Null

if ($p.ExitCode -eq 0) {
    Write-Host "SUCCESS. Connect with: host=localhost, port=1433, user=sa, password=$saPassword"
} else {
    Write-Host "Non-zero exit code - check the real setup log for the actual error:"
    Get-ChildItem "C:\Program Files\Microsoft SQL Server" -Directory | ForEach-Object {
        $logPath = Join-Path $_.FullName "Setup Bootstrap\Log\Summary.txt"
        if (Test-Path $logPath) { Write-Host "  $logPath" }
    }
}