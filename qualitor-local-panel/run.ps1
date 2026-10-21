$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Criei .env. Preencha as credenciais e execute novamente."
    notepad ".env"
    exit 0
}

python .\app.py
