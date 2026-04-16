'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Plus, Pencil, Eye, X, Loader2,
  ToggleLeft, ToggleRight, Megaphone, Users, Zap,
  Send, Ban, ChevronDown, ChevronRight, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────
interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  html_body: string;
  from_email: string;
  from_name: string;
  variables: string[];
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface TemplateFormState {
  id?: string;
  name: string;
  description: string;
  subject: string;
  html_body: string;
  from_email: string;
  from_name: string;
  variables: string;
}

interface Campaign {
  id: string;
  name: string;
  template_id: string;
  template?: EmailTemplate;
  segment_key: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  recipient_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

interface CampaignRecipient {
  id: string;
  email: string;
  business_name: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at: string | null;
  error_message: string | null;
}

interface SegmentInfo {
  key: string;
  label: string;
  description: string;
  count: number;
}

const EMPTY_FORM: TemplateFormState = {
  name: '', description: '', subject: '', html_body: '',
  from_email: 'admin@gettempo.ca', from_name: 'Tempo Books', variables: '',
};

const TABS = [
  { id: 'templates',   label: 'Templates',   icon: Mail,      ready: true  },
  { id: 'campaigns',   label: 'Campaigns',   icon: Megaphone, ready: true  },
  { id: 'leads',       label: 'Leads',       icon: Users,     ready: false },
  { id: 'automations', label: 'Automations', icon: Zap,       ready: false },
];

const STATUS_STYLE: Record<Campaign['status'], string> = {
  draft:     'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  sending:   'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  sent:      'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  cancelled: 'bg-destructive/10 text-destructive',
};

const RECIPIENT_STATUS_STYLE: Record<CampaignRecipient['status'], string> = {
  pending: 'bg-muted text-muted-foreground',
  sent:    'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  failed:  'bg-destructive/10 text-destructive',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function parseVars(raw: string): string[] {
  return raw.split(',').map((v) => v.trim()).filter(Boolean);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Slide-over ─────────────────────────────────────────────────────────────
function SlideOver({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <>
      <div className={cn('fixed inset-0 bg-black/40 z-40 transition-opacity duration-200',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')} onClick={onClose} />
      <div className={cn('fixed inset-y-0 right-0 w-full max-w-2xl bg-card border-l border-border z-50',
        'flex flex-col shadow-2xl transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">{children}</div>
      </div>
    </>
  );
}

// ── Preview modal ──────────────────────────────────────────────────────────
function PreviewModal({ open, subject, html, onClose }: {
  open: boolean; subject: string; html: string; onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">Preview</p>
            <p className="text-sm font-medium text-foreground">{subject || '(no subject)'}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <iframe srcDoc={html} sandbox="allow-same-origin"
            className="w-full h-[600px] rounded-lg border border-border bg-white" title="Email preview" />
        </div>
      </div>
    </div>
  );
}

// ── Campaign wizard modal ──────────────────────────────────────────────────
function CampaignWizard({ open, onClose, templates, onCreated }: {
  open: boolean;
  onClose: () => void;
  templates: EmailTemplate[];
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [loadingSegs, setLoadingSegs] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selectCls = 'w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary';

  useEffect(() => {
    if (open && segments.length === 0) {
      setLoadingSegs(true);
      fetch('/api/proxy/admin/segments')
        .then((r) => r.json())
        .then((d) => setSegments(d))
        .catch(() => {})
        .finally(() => setLoadingSegs(false));
    }
  }, [open]);

  function handleClose() {
    setStep(1); setSelectedSegment(''); setSelectedTemplate('');
    setCampaignName(''); setError(''); onClose();
  }

  async function handleCreateAndSend() {
    if (!campaignName.trim()) { setError('Campaign name is required.'); return; }
    setSaving(true); setError('');
    try {
      // Create campaign
      const createRes = await fetch('/api/proxy/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: campaignName, template_id: selectedTemplate, segment_key: selectedSegment }),
      });
      const campaign = await createRes.json();
      if (!createRes.ok) throw new Error(campaign.message ?? 'Create failed');

      // Send immediately
      setSending(true);
      const sendRes = await fetch('/api/proxy/admin/campaigns/' + campaign.id + '/send', { method: 'POST' });
      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(sendData.message ?? 'Send failed');

      onCreated();
      handleClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false); setSending(false);
    }
  }

  async function handleSaveDraft() {
    if (!campaignName.trim()) { setError('Campaign name is required.'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/proxy/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: campaignName, template_id: selectedTemplate, segment_key: selectedSegment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Save failed');
      onCreated();
      handleClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedSeg = segments.find((s) => s.key === selectedSegment);
  const selectedTpl = templates.find((t) => t.id === selectedTemplate);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">
              Step {step} of 3
            </p>
            <h3 className="text-base font-semibold text-foreground">New Campaign</h3>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-6 pt-4 gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn('flex-1 h-1 rounded-full transition-colors',
              s <= step ? 'bg-primary' : 'bg-muted')} />
          ))}
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Step 1: Segment */}
          {step === 1 && (
            <>
              <p className="text-sm font-medium text-foreground">Choose audience segment</p>
              {loadingSegs ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading segments…</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {segments.map((seg) => (
                    <button
                      key={seg.key}
                      onClick={() => setSelectedSegment(seg.key)}
                      className={cn(
                        'w-full text-left rounded-xl border px-4 py-3 transition-colors',
                        selectedSegment === seg.key
                          ? 'border-primary bg-primary-light dark:bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted/30',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{seg.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{seg.description}</p>
                        </div>
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full ml-3 flex-shrink-0',
                          seg.count > 0
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-muted text-muted-foreground',
                        )}>
                          {seg.count} recipient{seg.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step 2: Template */}
          {step === 2 && (
            <>
              <p className="text-sm font-medium text-foreground">Choose email template</p>
              {templates.filter((t) => t.is_active).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No active templates. Create and activate a template first.</p>
              ) : (
                <div className="space-y-2">
                  {templates.filter((t) => t.is_active).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={cn(
                        'w-full text-left rounded-xl border px-4 py-3 transition-colors',
                        selectedTemplate === t.id
                          ? 'border-primary bg-primary-light dark:bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted/30',
                      )}
                    >
                      <p className="text-sm font-mono font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.subject}</p>
                      {t.description && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{t.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step 3: Name + confirm */}
          {step === 3 && (
            <>
              <p className="text-sm font-medium text-foreground">Name this campaign</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Campaign Name</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. April trial nudge"
                  autoFocus
                />
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Segment</span>
                  <span className="font-medium text-foreground">{selectedSeg?.label} ({selectedSeg?.count} recipients)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template</span>
                  <span className="font-mono text-foreground">{selectedTpl?.name}</span>
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border gap-3">
          <Button variant="outline" onClick={step === 1 ? handleClose : () => setStep(step - 1)} className="flex-shrink-0">
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <div className="flex gap-2">
            {step < 3 ? (
              <Button
                onClick={() => { setError(''); setStep(step + 1); }}
                disabled={
                  (step === 1 && !selectedSegment) ||
                  (step === 2 && !selectedTemplate)
                }
              >
                Next
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
                  {saving && !sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
                </Button>
                <Button onClick={handleCreateAndSend} disabled={saving}>
                  {sending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                    : <><Send className="w-4 h-4 mr-2" />Send Now</>
                  }
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Campaign recipients drawer ─────────────────────────────────────────────
function RecipientsRow({ campaignId }: { campaignId: string }) {
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/proxy/admin/campaigns/' + campaignId + '/recipients')
      .then((r) => r.json())
      .then((d) => setRecipients(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) return (
    <tr><td colSpan={7} className="px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />Loading recipients…
      </div>
    </td></tr>
  );

  return (
    <tr>
      <td colSpan={7} className="px-4 pb-4">
        <div className="rounded-xl border border-border overflow-hidden bg-muted/20 mt-1">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recipients ({recipients.length})</p>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-border">
            {recipients.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2">
                <p className="text-xs text-foreground flex-1 truncate">{r.email}</p>
                <p className="text-xs text-muted-foreground hidden md:block truncate max-w-[140px]">{r.business_name}</p>
                <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0',
                  RECIPIENT_STATUS_STYLE[r.status])}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export function CommandCenterClient() {
  const [activeTab, setActiveTab] = useState('templates');

  // ── Templates state ────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [sampleVars, setSampleVars] = useState<Record<string, string>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Campaigns state ────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/proxy/admin/templates');
      if (res.ok) setTemplates(await res.json());
    } catch { /* non-fatal */ }
    finally { setLoadingTemplates(false); }
  }, []);

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch('/api/proxy/admin/campaigns');
      if (res.ok) setCampaigns(await res.json());
    } catch { /* non-fatal */ }
    finally { setLoadingCampaigns(false); }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);
  useEffect(() => { if (activeTab === 'campaigns') loadCampaigns(); }, [activeTab, loadCampaigns]);

  // ── Template actions ───────────────────────────────────────────────────
  function openNew() {
    setEditingId(null); setForm(EMPTY_FORM); setFormError(''); setSampleVars({}); setSlideOpen(true);
  }

  function openEdit(t: EmailTemplate) {
    setEditingId(t.id);
    setForm({ id: t.id, name: t.name, description: t.description ?? '', subject: t.subject,
      html_body: t.html_body, from_email: t.from_email ?? 'admin@gettempo.ca',
      from_name: t.from_name ?? 'Tempo Books', variables: (t.variables ?? []).join(', ') });
    setFormError(''); setSampleVars({}); setSlideOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Template name is required.'); return; }
    if (!form.subject.trim()) { setFormError('Subject is required.'); return; }
    if (!form.html_body.trim()) { setFormError('HTML body is required.'); return; }
    setSaving(true); setFormError('');
    try {
      const payload = { name: form.name.trim(), description: form.description.trim(),
        subject: form.subject.trim(), html_body: form.html_body,
        from_email: form.from_email.trim() || 'admin@gettempo.ca',
        from_name: form.from_name.trim() || 'Tempo Books',
        variables: parseVars(form.variables) };
      const url = editingId ? '/api/proxy/admin/templates/' + editingId : '/api/proxy/admin/templates';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Save failed');
      await loadTemplates(); setSlideOpen(false); setEditingId(null);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  async function handlePreview() {
    const id = editingId ?? form.id;
    if (!id) return;
    setPreviewing(true);
    try {
      const res = await fetch('/api/proxy/admin/templates/' + id + '/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: sampleVars }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Preview failed');
      setPreviewSubject(data.subject); setPreviewHtml(data.html); setPreviewOpen(true);
    } catch (e: any) { setFormError(e.message); }
    finally { setPreviewing(false); }
  }

  async function handleQuickPreview(t: EmailTemplate) {
    setPreviewing(true);
    try {
      const res = await fetch('/api/proxy/admin/templates/' + t.id + '/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vars: {} }) });
      const data = await res.json();
      if (!res.ok) return;
      setPreviewSubject(data.subject); setPreviewHtml(data.html); setPreviewOpen(true);
    } catch { /* non-fatal */ }
    finally { setPreviewing(false); }
  }

  async function handleToggle(t: EmailTemplate) {
    setTogglingId(t.id);
    try {
      const url = t.is_active ? '/api/proxy/admin/templates/' + t.id : '/api/proxy/admin/templates/' + t.id + '/reactivate';
      const method = t.is_active ? 'DELETE' : 'POST';
      const res = await fetch(url, { method });
      if (res.ok) setTemplates((prev) => prev.map((item) => item.id === t.id ? { ...item, is_active: !t.is_active } : item));
    } finally { setTogglingId(null); }
  }

  // ── Campaign actions ───────────────────────────────────────────────────
  async function handleSendDraft(id: string) {
    setSendingId(id);
    try {
      const res = await fetch('/api/proxy/admin/campaigns/' + id + '/send', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Send failed');
      await loadCampaigns();
    } catch (e: any) { alert(e.message); }
    finally { setSendingId(null); }
  }

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      const res = await fetch('/api/proxy/admin/campaigns/' + id + '/cancel', { method: 'POST' });
      if (res.ok) setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: 'cancelled' } : c));
    } finally { setCancellingId(null); }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Command Center
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Email templates, campaigns, leads, and automation rules — no deploy needed.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border -mx-6 px-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => tab.ready && setActiveTab(tab.id)}
                className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                  !tab.ready && 'opacity-50 cursor-not-allowed')}
                disabled={!tab.ready}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {!tab.ready && (
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-semibold ml-1">Soon</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">

        {/* ── Templates tab ── */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
              <Button size="sm" onClick={openNew} className="h-8 gap-1.5">
                <Plus className="w-3.5 h-3.5" />New Template
              </Button>
            </div>

            {loadingTemplates ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading templates…</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">No templates yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">Create your first email template. All future emails will be sent from here, no code changes needed.</p>
                <Button size="sm" onClick={openNew} className="mt-1 gap-1.5"><Plus className="w-3.5 h-3.5" />Create First Template</Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Subject</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">From</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Updated</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-16">v</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-20">Status</th>
                      <th className="px-4 py-2.5 w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {templates.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-semibold text-foreground">{t.name}</p>
                          {t.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[160px]">{t.description}</p>}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]"><p className="text-xs text-foreground truncate">{t.subject}</p></td>
                        <td className="px-4 py-3 hidden md:table-cell"><p className="text-xs text-muted-foreground">{t.from_email || '—'}</p></td>
                        <td className="px-4 py-3 hidden lg:table-cell"><p className="text-xs text-muted-foreground">{fmtDate(t.updated_at)}</p></td>
                        <td className="px-4 py-3"><span className="text-xs font-mono text-muted-foreground">v{t.version}</span></td>
                        <td className="px-4 py-3">
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            t.is_active ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-muted text-muted-foreground')}>
                            {t.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleQuickPreview(t)} disabled={previewing}
                              className="text-muted-foreground hover:text-primary transition-colors p-1 rounded" title="Preview">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(t)}
                              className="text-muted-foreground hover:text-primary transition-colors p-1 rounded" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleToggle(t)} disabled={togglingId === t.id}
                              className={cn('transition-colors p-1 rounded',
                                t.is_active ? 'text-muted-foreground hover:text-amber-500' : 'text-muted-foreground hover:text-green-600')}
                              title={t.is_active ? 'Deactivate' : 'Reactivate'}>
                              {togglingId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : t.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Campaigns tab ── */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
                <button onClick={loadCampaigns} disabled={loadingCampaigns}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" title="Refresh">
                  <RefreshCw className={cn('w-3.5 h-3.5', loadingCampaigns && 'animate-spin')} />
                </button>
              </div>
              <Button size="sm" onClick={() => setWizardOpen(true)} className="h-8 gap-1.5">
                <Plus className="w-3.5 h-3.5" />New Campaign
              </Button>
            </div>

            {loadingCampaigns ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading campaigns…</span>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/10 flex items-center justify-center">
                  <Megaphone className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">No campaigns yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">Send your first email campaign to a segment of users in a few clicks.</p>
                <Button size="sm" onClick={() => setWizardOpen(true)} className="mt-1 gap-1.5">
                  <Plus className="w-3.5 h-3.5" />Create First Campaign
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-6" />
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">Segment</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Template</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-20">Sent</th>
                      <th className="px-4 py-2.5 w-28" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {campaigns.map((c) => (
                      <>
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpandedCampaignId(expandedCampaignId === c.id ? null : c.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="View recipients"
                            >
                              {expandedCampaignId === c.id
                                ? <ChevronDown className="w-3.5 h-3.5" />
                                : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(c.created_at)}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-xs text-muted-foreground font-mono">{c.segment_key}</p>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <p className="text-xs text-muted-foreground font-mono">{c.template?.name ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', STATUS_STYLE[c.status])}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-muted-foreground">{c.recipient_count > 0 ? c.recipient_count : '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              {c.status === 'draft' && (
                                <button
                                  onClick={() => handleSendDraft(c.id)}
                                  disabled={sendingId === c.id}
                                  className="text-muted-foreground hover:text-primary transition-colors p-1 rounded"
                                  title="Send now"
                                >
                                  {sendingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              {['draft', 'scheduled'].includes(c.status) && (
                                <button
                                  onClick={() => handleCancel(c.id)}
                                  disabled={cancellingId === c.id}
                                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                                  title="Cancel"
                                >
                                  {cancellingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedCampaignId === c.id && <RecipientsRow key={c.id + '-recipients'} campaignId={c.id} />}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Placeholder tabs ── */}
        {!['templates', 'campaigns'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            {activeTab === 'leads' && <Users className="w-10 h-10 text-muted-foreground/40" />}
            {activeTab === 'automations' && <Zap className="w-10 h-10 text-muted-foreground/40" />}
            <p className="text-sm font-medium text-foreground capitalize">{activeTab} — Coming in Phase 23</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {activeTab === 'leads' && 'Capture, track, and nurture leads from your marketing site through to conversion.'}
              {activeTab === 'automations' && 'Wire any system event to any email template, with optional delay. No code needed.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Template slide-over ── */}
      <SlideOver open={slideOpen} title={editingId ? 'Edit Template' : 'New Template'} onClose={() => { setSlideOpen(false); setEditingId(null); }}>
        {editingId && parseVars(form.variables).length > 0 && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sample values for preview</p>
            <div className="grid grid-cols-2 gap-2">
              {parseVars(form.variables).map((v) => (
                <div key={v} className="space-y-1">
                  <Label className="text-[11px] font-mono text-muted-foreground">{'{{'}{v}{'}}'}</Label>
                  <Input value={sampleVars[v] ?? ''} onChange={(e) => setSampleVars((prev) => ({ ...prev, [v]: e.target.value }))}
                    placeholder={'Sample ' + v} className="h-7 text-xs" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Template Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. signup_welcome" className="font-mono text-sm" disabled={!!editingId} />
            {editingId && <p className="text-xs text-muted-foreground">Name cannot be changed after creation.</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Internal label" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">From Email</Label>
              <Input value={form.from_email} onChange={(e) => setForm((p) => ({ ...p, from_email: e.target.value }))} placeholder="admin@gettempo.ca" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From Name</Label>
              <Input value={form.from_name} onChange={(e) => setForm((p) => ({ ...p, from_name: e.target.value }))} placeholder="Tempo Books" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Subject <span className="text-destructive">*</span></Label>
            <Input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Welcome to Tempo Books" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">HTML Body <span className="text-destructive">*</span></Label>
            <textarea value={form.html_body} onChange={(e) => setForm((p) => ({ ...p, html_body: e.target.value }))} rows={14}
              placeholder={'<!DOCTYPE html>\n<html><body>\n  <p>Hi {{first_name}},</p>\n</body></html>'}
              className="w-full font-mono text-xs border border-border rounded-lg px-3 py-2 bg-card text-foreground resize-y outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Variables (comma-separated)</Label>
            <Input value={form.variables} onChange={(e) => setForm((p) => ({ ...p, variables: e.target.value }))} placeholder="first_name, plan_name" />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex gap-3 pt-2 border-t border-border">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : editingId ? 'Save Changes' : 'Create Template'}
            </Button>
            <Button variant="outline" onClick={handlePreview} disabled={previewing || !editingId} title={!editingId ? 'Save template first to preview' : 'Preview'}>
              {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </SlideOver>

      {/* ── Preview modal ── */}
      <PreviewModal open={previewOpen} subject={previewSubject} html={previewHtml} onClose={() => setPreviewOpen(false)} />

      {/* ── Campaign wizard ── */}
      <CampaignWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        templates={templates}
        onCreated={loadCampaigns}
      />
    </div>
  );
}
