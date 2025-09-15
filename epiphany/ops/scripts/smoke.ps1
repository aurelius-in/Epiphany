param(
	[string]$ApiBase = "http://localhost:4000",
	[string]$ApiKey = "dev"
)

Write-Host "Checking health..."
try {
	$health = Invoke-RestMethod -Headers @{"X-API-Key"=$ApiKey} -Uri "$ApiBase/v1/health" -Method GET
	Write-Host "Health:" ($health | ConvertTo-Json -Compress)
} catch {
	Write-Error $_
	exit 1
}
