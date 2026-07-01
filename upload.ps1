$zipPath = "C:\Users\admin\Desktop\Walrus Forum\mini-forum-app\dist.zip"
$bytes = [System.IO.File]::ReadAllBytes($zipPath)
Write-Host "Size: $($bytes.Length) bytes"
try {
    $r = Invoke-RestMethod -Uri "https://publisher.walrus-testnet.walrus.space/v1/blobs" -Method Put -Body $bytes -ContentType "application/zip" -TimeoutSec 120
    $r | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_"
}
