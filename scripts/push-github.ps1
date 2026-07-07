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

$view = & $gh repo view $orgRepo 2>&1
if ($LASTEXITCODE -eq 0) {
  git remote set-url origin "https://github.com/$orgRepo.git"
  git push -u origin main
  Write-Host "Done: https://github.com/$orgRepo" -ForegroundColor Green
  exit 0
}

Write-Host "Creating repo $orgRepo ..." -ForegroundColor Cyan
& $gh repo create $orgRepo --private --description 'Nova Plus Wallet - Signet fork for Nova Bank mesh' --source=. --remote=origin --push
if ($LASTEXITCODE -eq 0) {
  Write-Host "Done: https://github.com/$orgRepo" -ForegroundColor Green
  exit 0
}

Write-Host "Org repo unavailable - creating $userRepo on your account ..." -ForegroundColor Yellow
& $gh repo create $userRepo --private --description 'Nova Plus Wallet - Signet fork for Nova Bank mesh' --source=. --remote=origin --push
Write-Host "Done: transfer to novatrusty2-ops when ready" -ForegroundColor Green
