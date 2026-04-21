Add-Type -AssemblyName System.Net.Http

$uri = "http://localhost:8000/v1/detect"
$filePath = "F:\apps\main working apps\alertness-monitor\data\images\awake.3d934518-3dbf-11f1-81f0-0abfb8569c12.jpg"

$client = New-Object System.Net.Http.HttpClient
$content = New-Object System.Net.Http.MultipartFormDataContent

$fileStream = [System.IO.File]::OpenRead($filePath)
$fileContent = New-Object System.Net.Http.StreamContent($fileStream)
$fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("image/jpeg")

$content.Add($fileContent, "image", [System.IO.Path]::GetFileName($filePath))

$response = $client.PostAsync($uri, $content).Result
$response.Content.ReadAsStringAsync().Result