param(
    [Parameter(Mandatory = $true)]
    [string]$Feature,
    [string]$BaseBranch = "main",
    [string]$Label = "feature"
)

$ErrorActionPreference = "Stop"

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is not installed or not in PATH."
    }
}

Assert-Command "git"

$cleanFeature = $Feature.Trim()
if ([string]::IsNullOrWhiteSpace($cleanFeature)) {
    throw "Feature cannot be empty."
}

$slug = ($cleanFeature.ToLower() -replace "[^a-z0-9]+", "-").Trim("-")
if ($slug.Length -gt 40) {
    $slug = $slug.Substring(0, 40).Trim("-")
}
if ([string]::IsNullOrWhiteSpace($slug)) {
    $slug = "feature"
}

$branch = "feature/$((Get-Date).ToString('yyyyMMdd'))-$slug"

Write-Host "Syncing from base branch: $BaseBranch"
git checkout $BaseBranch | Out-Null

Write-Host "Creating branch: $branch"
git checkout -b $branch | Out-Null

$issueNumber = $null
$issueUrl = $null

if (Get-Command gh -ErrorAction SilentlyContinue) {
    $authOk = $true
    try {
        gh auth status | Out-Null
    } catch {
        $authOk = $false
    }

    if ($authOk) {
        $issueTitle = "Feature: $($cleanFeature.Substring(0, [Math]::Min(80, $cleanFeature.Length)))"
        $issueBody = @"
## Feature Request
$cleanFeature

## Delivery Checklist
- [ ] Plan created
- [ ] Implementation complete
- [ ] Tests added/updated
- [ ] CI quality gates passing
- [ ] PR opened
"@

        Write-Host "Creating GitHub issue..."
        try {
            $issueUrl = gh issue create --title "$issueTitle" --body "$issueBody" --label "$Label"
        } catch {
            Write-Warning "Issue label '$Label' was not available. Creating issue without label."
            $issueUrl = gh issue create --title "$issueTitle" --body "$issueBody"
        }
        if ($issueUrl) {
            if ($issueUrl -match '/([0-9]+)$') {
                $issueNumber = $Matches[1]
            }
        }
    } else {
        Write-Warning "gh CLI is installed but not authenticated. Skipping issue creation."
    }
} else {
    Write-Warning "gh CLI is not installed. Skipping issue creation."
}

Write-Host ""
Write-Host "Feature orchestration initialized."
Write-Host "Branch: $branch"
if ($issueNumber) {
    Write-Host "Issue: #$issueNumber ($issueUrl)"
} else {
    Write-Host "Issue: not created automatically"
}
Write-Host ""
Write-Host "Next steps:"
Write-Host "1) Plan with Feature Planner agent"
Write-Host "2) Implement with Frontend/Backend Developer agents"
Write-Host "3) Validate with TDD Engineer and Ops CI Engineer"
