# Phase 31c.3 install script
#
# Copies two new files (server page + client wrapper) and patches sidebar.tsx
# with three anchor edits:
#   1. Add FileArchive to the lucide-react import list
#   2. Add Receipt Export entry to reportItems (business mode)
#   3. Add Receipt Export entry to freelancerReportItems
#
# The same anchor for #2 and #3 happens to appear twice in the file (once in
# each array), so a global string Replace handles both insertions in one call.

$ErrorActionPreference = 'Stop'
$root = "C:\Users\Admin\OneDrive\Documents\ayende_bookkeeping_multitenant"

Write-Host ""
Write-Host "Phase 31c.3 install starting..."
Write-Host ""

# ============================================================================
# File 1: page.tsx (new) under (app)/reports/receipt-export/
# ============================================================================
$src1 = Join-Path $PSScriptRoot "files\apps\web\src\app\(app)\reports\receipt-export\page.tsx"
$dstDir1 = Join-Path $root "apps\web\src\app\(app)\reports\receipt-export"
$dst1 = Join-Path $dstDir1 "page.tsx"

if (-not (Test-Path -LiteralPath $src1)) {
    Write-Error "[FAIL] Source not found: $src1"
    exit 1
}
if (-not (Test-Path -LiteralPath $dstDir1)) {
    Write-Error "[FAIL] Destination dir not found (should exist from 31c.1): $dstDir1"
    exit 1
}

Copy-Item -LiteralPath $src1 -Destination $dst1 -Force
Write-Host "[OK] Wrote $dst1"

# ============================================================================
# File 2: receipt-export-page-client.tsx (new) under components/
# ============================================================================
$src2 = Join-Path $PSScriptRoot "files\apps\web\src\components\receipt-export-page-client.tsx"
$dstDir2 = Join-Path $root "apps\web\src\components"
$dst2 = Join-Path $dstDir2 "receipt-export-page-client.tsx"

if (-not (Test-Path -LiteralPath $src2)) {
    Write-Error "[FAIL] Source not found: $src2"
    exit 1
}

Copy-Item -LiteralPath $src2 -Destination $dst2 -Force
Write-Host "[OK] Wrote $dst2"

# ============================================================================
# Edit: sidebar.tsx - 3 anchor edits via String.Replace (not regex)
# ============================================================================
$sidebar = Join-Path $root "apps\web\src\components\sidebar.tsx"

if (-not (Test-Path -LiteralPath $sidebar)) {
    Write-Error "[FAIL] sidebar.tsx not found at $sidebar"
    exit 1
}

# Read with explicit UTF-8 (no BOM); raw single-string for .Replace()
$content = [System.IO.File]::ReadAllText($sidebar, [System.Text.UTF8Encoding]::new($false))

# --- Anchor 1: lucide-react import - add FileArchive ---
$importOld = "  Landmark, Bell, X, Wand2, Lock, Sun, Moon, Upload,"
$importNew = "  Landmark, Bell, X, Wand2, Lock, Sun, Moon, Upload, FileArchive,"

if ($content.IndexOf($importOld) -lt 0) {
    Write-Error "[FAIL] Anchor 1 (lucide imports) not found verbatim in sidebar.tsx"
    exit 1
}
if (([regex]::Matches($content, [regex]::Escape($importOld))).Count -ne 1) {
    Write-Error "[FAIL] Anchor 1 expected exactly 1 match in sidebar.tsx"
    exit 1
}
$content = $content.Replace($importOld, $importNew)
Write-Host "[OK] Edited sidebar.tsx anchor 1: lucide-react FileArchive import"

# --- Anchors 2 and 3: insert Receipt Export entry after both Year-End lines ---
# The Year-End line appears identically in both reportItems and freelancerReportItems.
# We craft the anchor as a 2-line block (HST line + Year-End line) so .Replace
# matches both occurrences and inserts our new line after each.
#
# CRITICAL: line endings in sidebar.tsx are CRLF on Windows. Read confirmed
# original repo uses LF for most files but Windows checkout converts to CRLF.
# Using \r\n in the anchor pattern matches both LF and CRLF safely because
# .Replace() works on the in-memory string content as-is.

$yearEndOld = @'
  { href: '/reports/hst',              label: 'HST / GST Report', icon: Receipt },
  { href: '/year-end',                 label: 'Year-End Report',  icon: Wand2 },
];
'@

$yearEndNew = @'
  { href: '/reports/hst',              label: 'HST / GST Report', icon: Receipt },
  { href: '/year-end',                 label: 'Year-End Report',  icon: Wand2 },
  { href: '/reports/receipt-export',   label: 'Receipt Export',   icon: FileArchive },
];
'@

# Normalize anchor line endings to whatever the file uses.
# Detect by sampling: if file contains \r\n use CRLF, otherwise LF.
$useCrlf = $content.Contains("`r`n")
if ($useCrlf) {
    $yearEndOld = $yearEndOld.Replace("`n", "`r`n").Replace("`r`r`n", "`r`n")
    $yearEndNew = $yearEndNew.Replace("`n", "`r`n").Replace("`r`r`n", "`r`n")
}

$matchCount = ([regex]::Matches($content, [regex]::Escape($yearEndOld))).Count
if ($matchCount -ne 2) {
    Write-Error "[FAIL] Anchor 2/3 expected exactly 2 matches in sidebar.tsx (found $matchCount)"
    exit 1
}

$content = $content.Replace($yearEndOld, $yearEndNew)
Write-Host "[OK] Edited sidebar.tsx anchors 2 and 3: reportItems + freelancerReportItems"

# Write back with explicit UTF-8 (no BOM) to preserve original encoding
[System.IO.File]::WriteAllText($sidebar, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "[OK] Saved sidebar.tsx"

Write-Host ""
Write-Host "Phase 31c.3 file install complete. Run tsc verification next."
Write-Host ""
