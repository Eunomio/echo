[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$credentialPath = Join-Path $PSScriptRoot 'modelscope.env'
$taskSecret = Read-Host 'Paste the ModelScope access token (input is hidden)' -AsSecureString
$taskSecretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecret)

try {
    $taskToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskSecretPointer).Trim()
    if ([string]::IsNullOrWhiteSpace($taskToken) -or $taskToken -match '\s') {
        throw 'The access token must be nonempty and contain no whitespace.'
    }
    [IO.File]::WriteAllText($credentialPath, "MODELSCOPE_API_KEY=$taskToken`n", [Text.UTF8Encoding]::new($false))
    $taskIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $taskAcl = [Security.AccessControl.FileSecurity]::new()
    $taskAcl.SetAccessRuleProtection($true, $false)
    $taskAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($taskIdentity, 'FullControl', 'Allow'))
    $taskAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-5-18'), 'FullControl', 'Allow'))
    Set-Acl -LiteralPath $credentialPath -AclObject $taskAcl
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskSecretPointer)
    $taskToken = $null
    $taskSecret.Dispose()
}

Write-Host 'Token saved locally. Its value has not been printed.'
Write-Host "File: $credentialPath"
Write-Host 'This file is excluded from Git, Docker builds, and the prepared upload package.'
