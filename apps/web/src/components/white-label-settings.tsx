'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { updateFirm, checkSubdomainAvailability, FirmSettings } from '@/app/(accountant)/accountant/settings/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhiteLabelSettingsProps {
  firm: FirmSettings;
}

export function WhiteLabelSettings({ firm }: WhiteLabelSettingsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName]               = useState(firm.name);
  const [subdomain, setSubdomain]     = useState(firm.subdomain);
  const [logoUrl, setLogoUrl]         = useState<string | null>(firm.logo_url);
  const [brandColour, setBrandColour] = useState(firm.brand_colour ?? '#1B3A5C');

  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Subdomain availability
  const [subdomainStatus, setSubdomainStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [subdomainMessage, setSubdomainMessage] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Logo upload state
  const [logoError, setLogoError] = useState<string | null>(null);

  // ── Subdomain availability check (debounced 500ms) ──────────────────────
  useEffect(() => {
    if (subdomain === firm.subdomain) {
      setSubdomainStatus('idle');
      setSubdomainMessage('');
      return;
    }
    setSubdomainStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await checkSubdomainAvailability(subdomain, firm.subdomain);
      setSubdomainStatus(result.available ? 'available' : 'taken');
      setSubdomainMessage(result.message);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [subdomain, firm.subdomain]);

  // ── Logo upload ──────────────────────────────────────────────────────────
  function handleLogoFile(file: File) {
    setLogoError(null);
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo must be under 2 MB.');
      return;
    }
    if (!['image/png', 'image/svg+xml', 'image/jpeg'].includes(file.type)) {
      setLogoError('Only PNG, SVG, and JPG files are supported.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoUrl(e.target?.result as string ?? null);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleLogoFile(file);
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    if (subdomainStatus === 'taken' || subdomainStatus === 'invalid') {
      setSaveError('Please fix the subdomain before saving.');
      setSaving(false);
      return;
    }

    const result = await updateFirm({
      name:         name.trim(),
      subdomain:    subdomain.trim(),
      logo_url:     logoUrl ?? undefined,
      brand_colour: brandColour,
    });

    setSaving(false);
    if (!result.success) {
      setSaveError(result.error ?? 'Failed to save settings.');
      return;
    }
    setSaveSuccess(true);
    router.refresh();
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  return (
    <div className="space-y-6">

      {/* ── Firm Identity ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Firm Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firmName">Firm Name</Label>
            <Input
              id="firmName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Smith & Co Accounting"
            />
            <p className="text-xs text-muted-foreground">
              Shown in the portal header, emails, and white-label branding.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subdomain">Subdomain</Label>
            <div className="flex items-center gap-0">
              <Input
                id="subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="smithco"
                className="rounded-r-none"
              />
              <span className="flex items-center px-3 h-9 border border-l-0 rounded-r-md bg-muted text-muted-foreground text-sm">
                .gettempo.ca
              </span>
            </div>
            {subdomainStatus === 'checking' && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking availability…
              </p>
            )}
            {subdomainStatus === 'available' && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {subdomainMessage}
              </p>
            )}
            {(subdomainStatus === 'taken' || subdomainStatus === 'invalid') && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="w-3 h-3" /> {subdomainMessage}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Branding ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Logo upload */}
          <div className="space-y-2">
            <Label>Firm Logo</Label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                'border-border hover:border-muted-foreground hover:bg-accent/30',
              )}
            >
              {logoUrl ? (
                <div className="relative">
                  <img
                    src={logoUrl}
                    alt="Firm logo"
                    className="h-16 max-w-48 object-contain rounded"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLogoUrl(null); }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Drop logo here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PNG, SVG, or JPG — max 2 MB</p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
            />
            {logoError && <p className="text-xs text-destructive">{logoError}</p>}
          </div>

          {/* Brand colour */}
          <div className="space-y-2">
            <Label>Brand Colour</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandColour}
                onChange={(e) => setBrandColour(e.target.value)}
                className="w-10 h-10 rounded-md border border-input cursor-pointer p-0.5 bg-transparent"
              />
              <Input
                value={brandColour}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setBrandColour(val);
                }}
                placeholder="#1B3A5C"
                className="w-32 font-mono text-sm"
              />
              <div
                className="w-10 h-10 rounded-md border border-border flex-shrink-0"
                style={{ backgroundColor: brandColour }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used as the primary colour on your firm's subdomain.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Save ────────────────────────────────────────────────────── */}
      {saveError && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{saveError}</p>
      )}
      {saveSuccess && (
        <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 px-3 py-2 rounded-md flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Settings saved successfully.
        </p>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save Settings
      </Button>
    </div>
  );
}
