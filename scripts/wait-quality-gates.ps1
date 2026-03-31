param(
    [Parameter(Mandatory = $true)]
    [int]$PullRequestNumber
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "gh CLI is required for this script."
}

Write-Host "Watching checks for PR #$PullRequestNumber..."
gh pr checks $PullRequestNumber --watch --interval 10
