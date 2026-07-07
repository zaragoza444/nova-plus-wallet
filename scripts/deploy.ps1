# Deploy Nova Plus Wallet to VPS (novablockchainsystem.com)
param(
  [string]$VpsHost = 'ubuntu@51.75.64.28',
  [string]$RemotePath = '/var/www/nova-plus-wallet',
  [string]$BasePath = '/wallet/'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

Write-Host '=== Build Nova Plus Wallet ===' -ForegroundColor Cyan
$env:VITE_BASE_PATH = $BasePath
npm run build
if (-not (Test-Path 'dist/index.html')) { throw 'dist missing' }

Write-Host "=== Upload to ${VpsHost}:${RemotePath} ===" -ForegroundColor Cyan
ssh -o BatchMode=yes $VpsHost "sudo mkdir -p $RemotePath && sudo chown `$USER`: $RemotePath"
scp -o BatchMode=yes -r dist/* "${VpsHost}:${RemotePath}/"
ssh -o BatchMode=yes $VpsHost "sudo chmod -R a+rX $RemotePath"

Write-Host ''
Write-Host 'Add nginx location (if missing):' -ForegroundColor Yellow
Write-Host "  location /wallet/ { alias /var/www/nova-plus-wallet/; try_files `$uri `$uri/ /wallet/index.html; }"
Write-Host ''
Write-Host "Live: http://51.75.64.28/wallet/" -ForegroundColor Green
