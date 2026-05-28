# ML Studio — Flask API (port 5001) + MLflow UI (port 5000)
Set-Location $PSScriptRoot
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Error "Run: python -m venv .venv; .\.venv\Scripts\pip install -r backend\requirements.txt"
    exit 1
}
.\.venv\Scripts\python.exe backend\app.py
