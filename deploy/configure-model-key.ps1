[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$taskProjectRoot = Split-Path -Parent $PSScriptRoot
$taskEnvPath = Join-Path $taskProjectRoot 'backend\.env'
if (-not (Test-Path -LiteralPath $taskEnvPath)) { throw 'The existing backend/.env file was not found.' }
$taskSecret = Read-Host 'Paste the refreshed school API key (input is hidden)' -AsSecureString
$taskSecretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecret)
try {
    $taskKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskSecretPointer).Trim()
    if ([string]::IsNullOrWhiteSpace($taskKey) -or $taskKey -match '\s') { throw 'The API key must be nonempty and contain no whitespace.' }
    $taskText = [IO.File]::ReadAllText($taskEnvPath, [Text.Encoding]::UTF8)
    $taskReplacement = [Text.RegularExpressions.MatchEvaluator]{ param($match) "OPENAI_API_KEY=$taskKey" }
    if ($taskText -match '(?m)^OPENAI_API_KEY\s*=') {
        $taskText = [regex]::Replace($taskText, '(?m)^OPENAI_API_KEY\s*=.*$', $taskReplacement)
    } else {
        $taskText += "`nOPENAI_API_KEY=$taskKey`n"
    }
    [IO.File]::WriteAllText($taskEnvPath, $taskText, [Text.UTF8Encoding]::new($false))
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskSecretPointer)
    $taskKey = $null
    $taskText = $null
    $taskSecret.Dispose()
}
Write-Host 'The school API key has been updated locally. Its value has not been printed.'
Write-Host 'Tell Codex that the key is updated so it can synchronize the Studio secret.'
