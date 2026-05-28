# ML Studio — React UI (port 5173, proxies /api -> :5001)
Set-Location $PSScriptRoot\frontend
if (-not (Test-Path "node_modules")) { npm install }
npm run dev
