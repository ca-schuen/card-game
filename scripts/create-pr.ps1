param(
    [Parameter(Mandatory = $true)]
    [int]$Issue,
    [Parameter(Mandatory = $true)]
    [string]$Title,
    [string]$BaseBranch = "main",
    [switch]$Draft
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "gh CLI is required for PR creation."
}

Write-Host "Running required quality gates..."
npm run lint
if ($LASTEXITCODE -ne 0) {
    throw "Lint failed."
}

npm run test
if ($LASTEXITCODE -ne 0) {
    throw "Tests failed."
}

$currentBranch = (git branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    throw "Could not determine current branch."
}

$body = @"
Closes #$Issue

## Summary
- Implemented feature linked to issue #$Issue
- Added/updated tests
- Local lint and tests passing
"@

$draftArg = @()
if ($Draft.IsPresent) {
    $draftArg = @("--draft")
}

Write-Host "Creating PR from $currentBranch to $BaseBranch..."
$prUrl = gh pr create --title "$Title" --body "$body" --base "$BaseBranch" --head "$currentBranch" @draftArg
Write-Host "PR created: $prUrl"
