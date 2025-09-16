param(
	[string]$ApiBase = "http://localhost:4000",
	[string]$ApiKey = "dev"
)

Write-Host "Checking health..."
$health = Invoke-RestMethod -Headers @{"X-API-Key"=$ApiKey} -Uri "$ApiBase/v1/health" -Method GET
Write-Host "Health:" ($health | ConvertTo-Json -Compress)

Write-Host "Requesting generate image job..."
$body = @{ prompt = "a test image"; mode = 0 } | ConvertTo-Json
$job = Invoke-RestMethod -Headers @{"X-API-Key"=$ApiKey; "Content-Type"="application/json"} -Uri "$ApiBase/v1/generate/image" -Method POST -Body $body
Write-Host "Job:" ($job | ConvertTo-Json -Compress)

$jobId = $job.id

$deadline = (Get-Date).AddMinutes(2)
Do {
	Start-Sleep -Seconds 2
	try {
		$st = Invoke-RestMethod -Headers @{"X-API-Key"=$ApiKey} -Uri "$ApiBase/v1/jobs/$jobId" -Method GET
		Write-Host "Status:" $st.status "Progress:" ($st.progress)
		if ($st.status -eq 'completed' -or $st.status -eq 'succeeded' -or $st.outputUrl) { break }
	} catch {
		Write-Host "poll error" $_
	}
} While ((Get-Date) -lt $deadline)

if ($st.outputUrl) { Write-Host "Output:" $st.outputUrl }
Write-Host "Done."
