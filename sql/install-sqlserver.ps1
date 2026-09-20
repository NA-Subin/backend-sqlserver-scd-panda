# Run this in an ELEVATED PowerShell (Right-click PowerShell -> Run as Administrator).
# Two phases: (1) download the full setup media via the small bootstrapper,
# (2) run the real setup.exe from that media with the unattended switches -
# the tiny bootstrapper itself doesn't reliably support /FEATURES etc.

$bootstrapper = Join-Path $PSScriptRoot "SQLServer-Dev-SSEI.exe"
$mediaPath = Join-Path $PSScriptRoot "sqlserver-media"
$saPassword = "YourStrong!Passw0rd"   # change this if you want a different sa password

if (-not (Test-Path $bootstrapper)) {
    Write-Error "Can't find $bootstrapper - copy SQLServer-Dev-SSEI.exe next to this script first."
    exit 1
}

New-Item -ItemType Directory -Force -Path $mediaPath | Out-Null

Write-Host "=== Phase 1: downloading full setup media to $mediaPath (this is the multi-GB part, be patient) ==="
$p1 = Start-Process -FilePath $bootstrapper -ArgumentList "/ACTION=Download", "/MEDIAPATH=`"$mediaPath`"", "/MEDIATYPE=CAB", "/IACCEPTSQLSERVERLICENSETERMS", "/QUIETSIMPLE" -Wait -PassThru
Write-Host "Phase 1 exit code: $($p1.ExitCode)"

$setupExe = Get-ChildItem -Path $mediaPath -Filter "setup.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $setupExe) {
    Write-Error "setup.exe not found under $mediaPath - Phase 1 download did not complete. Check $mediaPath and rerun."
    exit 1
}
Write-Host "Found setup.exe at $($setupExe.FullName)"

Write-Host "=== Phase 2: installing Database Engine (unattended) ==="
$p2 = Start-Process -FilePath $setupExe.FullName -ArgumentList `
    "/ACTION=Install", "/QUIET", "/IACCEPTSQLSERVERLICENSETERMS", `
    "/FEATURES=SQLEngine", `
    "/INSTANCENAME=MSSQLSERVER", `
    "/SECURITYMODE=SQL", "/SAPWD=$saPassword", `
    "/SQLSYSADMINACCOUNTS=`"BUILTIN\Administrators`"", `
    "/TCPENABLED=1" `
    -Wait -PassThru
Write-Host "Phase 2 exit code: $($p2.ExitCode)"

if ($p2.ExitCode -eq 0) {
    Write-Host "SUCCESS. Connect with: host=localhost, port=1433, user=sa, password=$saPassword"
} else {
    Write-Host "Install reported a non-zero exit code - check the real setup log:"
    Write-Host "  C:\Program Files\Microsoft SQL Server\<version>\Setup Bootstrap\Log\Summary.txt"
}
