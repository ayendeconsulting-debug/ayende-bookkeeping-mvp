# install.ps1 -- Phase 37: Lead form + emoji fix
# Run from: C:\Users\Admin\OneDrive\Documents\ayende_bookkeeping_multitenant

$root = "C:\Users\Admin\OneDrive\Documents\ayende_bookkeeping_multitenant"
$src  = "$PSScriptRoot\files"

$files = @(
  @{ from = "lead.entity.ts";            to = "apps\api\src\command-center\lead.entity.ts" },
  @{ from = "leads.service.ts";          to = "apps\api\src\command-center\leads.service.ts" },
  @{ from = "lead-enrichment.service.ts"; to = "apps\api\src\command-center\lead-enrichment.service.ts" },
  @{ from = "request-demo-button.tsx";   to = "apps\web\src\components\request-demo-button.tsx" }
)

foreach ($f in $files) {
  $dest = Join-Path $root $f.to
  Copy-Item -LiteralPath (Join-Path $src $f.from) -Destination $dest -Force
  Write-Host "Installed: $($f.to)"
}

Write-Host ""
Write-Host "--- Verifying key changes ---"
Select-String -LiteralPath (Join-Path $root "apps\api\src\command-center\lead.entity.ts") -Pattern "title"
Select-String -LiteralPath (Join-Path $root "apps\api\src\command-center\lead-enrichment.service.ts") -Pattern "\[HOT\]|\[WARM\]|\[COLD\]"
Select-String -LiteralPath (Join-Path $root "apps\web\src\components\request-demo-button.tsx") -Pattern "title|notes"

Write-Host ""
Write-Host "--- TypeScript check: api ---"
Set-Location (Join-Path $root "apps\api")
npx tsc --noEmit
Set-Location $root

Write-Host ""
Write-Host "--- TypeScript check: web ---"
Set-Location (Join-Path $root "apps\web")
npx tsc --noEmit
Set-Location $root

Write-Host ""
Write-Host "Done. Paste tsc output above before running Block 2."
