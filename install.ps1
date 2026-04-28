# Phase 31b.4 install script
# Copies new receipt-export.service.ts and performs anchor edits on
# reports.module.ts and ai.module.ts to wire forwardRef cycle.

$ErrorActionPreference = 'Stop'
$root = "C:\Users\Admin\OneDrive\Documents\ayende_bookkeeping_multitenant"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

Write-Host ""
Write-Host "Phase 31b.4 install starting..."
Write-Host ""

# ============================================================================
# File 1: receipt-export.service.ts (full replace)
# ============================================================================
$src1 = Join-Path $PSScriptRoot "files\apps\api\src\reports\services\receipt-export.service.ts"
$dst1 = Join-Path $root "apps\api\src\reports\services\receipt-export.service.ts"

if (-not (Test-Path -LiteralPath $src1)) {
    Write-Error "[FAIL] Source file not found: $src1"
    exit 1
}

Copy-Item -LiteralPath $src1 -Destination $dst1 -Force
Write-Host "[OK] Wrote $dst1"

# ============================================================================
# File 2: reports.module.ts (3 anchor edits)
# ============================================================================
$path2 = Join-Path $root "apps\api\src\reports\reports.module.ts"
$bytes2 = [System.IO.File]::ReadAllBytes($path2)
$content2 = [System.Text.Encoding]::UTF8.GetString($bytes2)

# Detect line endings (CRLF or LF)
$useCRLF2 = $content2.Contains("`r`n")
$norm2 = $content2.Replace("`r`n", "`n")

# --- Anchor edit 2.1: forwardRef on @nestjs/common import ---
$old2_1 = "import { Module } from '@nestjs/common';"
$new2_1 = "import { Module, forwardRef } from '@nestjs/common';"
if (-not $norm2.Contains($old2_1)) {
    Write-Error "[FAIL] reports.module.ts anchor 2.1 not found"
    exit 1
}
# Verify uniqueness
$count2_1 = ($norm2.Split([string[]]@($old2_1), [System.StringSplitOptions]::None).Length - 1)
if ($count2_1 -ne 1) {
    Write-Error "[FAIL] reports.module.ts anchor 2.1 occurs $count2_1 times (expected 1)"
    exit 1
}
$norm2 = $norm2.Replace($old2_1, $new2_1)

# --- Anchor edit 2.2: AiModule + DocumentsModule imports ---
$old2_2 = "import { YearEndExportService } from '../ai/services/year-end-export.service';`n`n@Module({"
$new2_2 = "import { YearEndExportService } from '../ai/services/year-end-export.service';`n// Phase 31b.4: AI + Documents modules (forwardRef breaks ReportsModule <-> AiModule cycle)`nimport { AiModule } from '../ai/ai.module';`nimport { DocumentsModule } from '../documents/documents.module';`n`n@Module({"
if (-not $norm2.Contains($old2_2)) {
    Write-Error "[FAIL] reports.module.ts anchor 2.2 not found"
    exit 1
}
$count2_2 = ($norm2.Split([string[]]@($old2_2), [System.StringSplitOptions]::None).Length - 1)
if ($count2_2 -ne 1) {
    Write-Error "[FAIL] reports.module.ts anchor 2.2 occurs $count2_2 times (expected 1)"
    exit 1
}
$norm2 = $norm2.Replace($old2_2, $new2_2)

# --- Anchor edit 2.3: AiModule + DocumentsModule in imports array ---
$old2_3 = "    BullModule.registerQueue({ name: RECEIPT_EXPORT_QUEUE }), // Phase 31`n  ],"
$new2_3 = "    BullModule.registerQueue({ name: RECEIPT_EXPORT_QUEUE }), // Phase 31`n    forwardRef(() => AiModule), // Phase 31b.4 - ExtractorService for run() fan-out`n    DocumentsModule, // Phase 31b.4 - DocumentsService for receipt fetch + zip upload`n  ],"
if (-not $norm2.Contains($old2_3)) {
    Write-Error "[FAIL] reports.module.ts anchor 2.3 not found"
    exit 1
}
$count2_3 = ($norm2.Split([string[]]@($old2_3), [System.StringSplitOptions]::None).Length - 1)
if ($count2_3 -ne 1) {
    Write-Error "[FAIL] reports.module.ts anchor 2.3 occurs $count2_3 times (expected 1)"
    exit 1
}
$norm2 = $norm2.Replace($old2_3, $new2_3)

# Restore line endings if originally CRLF
if ($useCRLF2) { $norm2 = $norm2.Replace("`n", "`r`n") }

[System.IO.File]::WriteAllText($path2, $norm2, $utf8NoBom)
Write-Host "[OK] Edited $path2 (3 anchors)"

# ============================================================================
# File 3: ai.module.ts (3 anchor edits)
# ============================================================================
$path3 = Join-Path $root "apps\api\src\ai\ai.module.ts"
$bytes3 = [System.IO.File]::ReadAllBytes($path3)
$content3 = [System.Text.Encoding]::UTF8.GetString($bytes3)

$useCRLF3 = $content3.Contains("`r`n")
$norm3 = $content3.Replace("`r`n", "`n")

# --- Anchor edit 3.1: forwardRef on @nestjs/common import ---
$old3_1 = "import { Module } from '@nestjs/common';"
$new3_1 = "import { Module, forwardRef } from '@nestjs/common';"
if (-not $norm3.Contains($old3_1)) {
    Write-Error "[FAIL] ai.module.ts anchor 3.1 not found"
    exit 1
}
$count3_1 = ($norm3.Split([string[]]@($old3_1), [System.StringSplitOptions]::None).Length - 1)
if ($count3_1 -ne 1) {
    Write-Error "[FAIL] ai.module.ts anchor 3.1 occurs $count3_1 times (expected 1)"
    exit 1
}
$norm3 = $norm3.Replace($old3_1, $new3_1)

# --- Anchor edit 3.2: wrap ReportsModule in forwardRef ---
$old3_2 = "    ReportsModule,`n    DocumentsModule,"
$new3_2 = "    forwardRef(() => ReportsModule), // Phase 31b.4 - cycle: ReportsModule injects ExtractorService`n    DocumentsModule,"
if (-not $norm3.Contains($old3_2)) {
    Write-Error "[FAIL] ai.module.ts anchor 3.2 not found"
    exit 1
}
$count3_2 = ($norm3.Split([string[]]@($old3_2), [System.StringSplitOptions]::None).Length - 1)
if ($count3_2 -ne 1) {
    Write-Error "[FAIL] ai.module.ts anchor 3.2 occurs $count3_2 times (expected 1)"
    exit 1
}
$norm3 = $norm3.Replace($old3_2, $new3_2)

# --- Anchor edit 3.3: export ExtractorService ---
$old3_3 = "  exports: [AiJobsService, AiUsageGuard, AiUsageService],"
$new3_3 = "  exports: [AiJobsService, AiUsageGuard, AiUsageService, ExtractorService], // Phase 31b.4"
if (-not $norm3.Contains($old3_3)) {
    Write-Error "[FAIL] ai.module.ts anchor 3.3 not found"
    exit 1
}
$count3_3 = ($norm3.Split([string[]]@($old3_3), [System.StringSplitOptions]::None).Length - 1)
if ($count3_3 -ne 1) {
    Write-Error "[FAIL] ai.module.ts anchor 3.3 occurs $count3_3 times (expected 1)"
    exit 1
}
$norm3 = $norm3.Replace($old3_3, $new3_3)

if ($useCRLF3) { $norm3 = $norm3.Replace("`n", "`r`n") }

[System.IO.File]::WriteAllText($path3, $norm3, $utf8NoBom)
Write-Host "[OK] Edited $path3 (3 anchors)"

Write-Host ""
Write-Host "Phase 31b.4 file install complete. Run tsc verification next."
Write-Host ""
