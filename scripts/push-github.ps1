# Push nova-plus-wallet to GitHub (novatrusty2-ops or your account)
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$gh = 'C:\Program Files\GitHub CLI\gh.exe'
if (-not (Test-Path $gh)) { $gh = 'gh' }

& $gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Run: gh auth login' -ForegroundColor Yellow
  exit 1
}

$orgRepo = 'novatrusty2-ops/nova-plus-wallet'
$userRepo = 'nova-plus-wallet'

if (-not (Test-Path .git)) {
  git init -b main
  git add -A
  git commit -m "Initial Nova Plus Wallet (Signet fork, Nova production chains)"
}

$orgExists = $false
try {
  & $gh repo view $orgRepo 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $orgExists = $true }
} catch {}

if ($orgExists) {
  git remote set-url origin "https://github.com/$orgRepo.git"
  git push -u origin main
  Write-Host "Done: https://github.com/$orgRepo" -ForegroundColor Green
  exit 0
}

Write-Host "Creating repo $orgRepo ..." -ForegroundColor Cyan
& $gh repo create $orgRepo --private --description 'Nova Plus Wallet - Signet fork for Nova Bank mesh' --source=. --remote=origin --push 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Done: https://github.com/$orgRepo" -ForegroundColor Green
  exit 0
}

Write-Host "Org repo unavailable - creating $userRepo on your account ..." -ForegroundColor Yellow
if (-not (git remote get-url origin 2>$null)) {
  git remote add origin "https://github.com/$( & $gh api user -q .login 2>$null )/$userRepo.git"
}
& $gh repo create $userRepo --private --description 'Nova Plus Wallet - Signet fork for Nova Bank mesh' --source=. --remote=origin --push
if ($LASTEXITCODE -eq 0) {
  $url = & $gh repo view --json url -q .url
  Write-Host "Done: $url" -ForegroundColor Green
  Write-Host 'Transfer to novatrusty2-ops when org access is available.' -ForegroundColor Gray
  exit 0
}
exit 1
