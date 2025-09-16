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
		$st = Invoke-RestMethod -Headers @{"X-API-Key"=$ApiKey} -Uri "$ApiBase/v1/jobs/$jobId?signed=1" -Method GET
		Write-Host "Status:" $st.status "Progress:" ($st.progress)
		if ($st.status -eq 'completed' -or $st.status -eq 'succeeded' -or $st.outputUrl) { break }
	} catch {
		Write-Host "poll error" $_
	}
} While ((Get-Date) -lt $deadline)

if ($st.outputUrl) { Write-Host "Output:" $st.outputUrl }
Write-Host "Done."

Write-Host "Video job..."
$bodyV = @{ prompt = "a test video"; mode = 0 } | ConvertTo-Json
$jobV = Invoke-RestMethod -Headers @{"X-API-Key"=$ApiKey; "Content-Type"="application/json"} -Uri "$ApiBase/v1/generate/video" -Method POST -Body $bodyV
$jobVId = $jobV.id
$deadline = (Get-Date).AddMinutes(2)
Do {
	Start-Sleep -Seconds 2
	try {
		$stV = Invoke-RestMethod -Headers @{"X-API-Key"=$ApiKey} -Uri "$ApiBase/v1/jobs/$jobVId?signed=1" -Method GET
		Write-Host "VStatus:" $stV.status "Progress:" ($stV.progress)
		if ($stV.outputUrl) { break }
	} catch {
		Write-Host "poll error" $_
	}
} While ((Get-Date) -lt $deadline)

Write-Host "Assets..."
$assets = Invoke-RestMethod -Headers @{"X-API-Key"=$ApiKey} -Uri "$ApiBase/v1/assets?signed=1&limit=5" -Method GET
if ($assets.items.Count -gt 0) { Write-Host "Asset URL:" $assets.items[0].url }

Write-Host "Events..."
$events = Invoke-RestMethod -Headers @{"X-API-Key"=$ApiKey} -Uri "$ApiBase/v1/events?limit=5" -Method GET
if ($events.items.Count -gt 0) { Write-Host "Event Type:" $events.items[0].type }

Write-Host "Edit job (upscale)..."
$ed = Invoke-RestMethod -Headers @{"X-API-Key"=$ApiKey; "Content-Type"="application/json"} -Uri "$ApiBase/v1/edit/upscale" -Method POST -Body '{"imageUrl":"http://example.com/foo.png","scale":2}'
$edId = $ed.id
$deadline = (Get-Date).AddMinutes(1)
Do {
	Start-Sleep -Seconds 2
	try {
		$stE = Invoke-RestMethod -Headers @{"X-API-Key"=$ApiKey} -Uri "$ApiBase/v1/jobs/$edId?signed=1" -Method GET
		Write-Host "EStatus:" $stE.status "Progress:" ($stE.progress)
		if ($stE.outputUrl) { break }
	} catch {
		Write-Host "poll error" $_
	}
} While ((Get-Date) -lt $deadline)
