'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail, Plus, Pencil, Eye, X, Loader2,
  ToggleLeft, ToggleRight, Trash2, Megaphone, Users, Zap,
  Send, Ban, ChevronDown, ChevronRight, RefreshCw, Calendar, Search,
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

interface SegmentRecipient {
  email: string;
  businessName: string;
  businessId: string;
}

const EMPTY_FORM: TemplateFormState = {
  name: '', description: '', subject: '', html_body: '',
  from_email: 'admin@gettempo.ca', from_name: 'Tempo Books', variables: '',
};

const TABS = [
  { id: 'templates',   label: 'Templates',   icon: Mail,      ready: true  },
  { id: 'campaigns',   label: 'Campaigns',   icon: Megaphone, ready: true  },
  { id: 'leads',       label: 'Leads',       icon: Users,     ready: true  },
  { id: 'automations', label: 'Automations', icon: Zap,       ready: true  },
];

const STATUS_STYLE: Record<Campaign['status'], string> = {
  draft:     'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  sending:   'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  sent:      'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  cancelled: 'bg-destructive/10 text-destructive',
};

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  phone: string;
  source: string;
  type: 'inbound' | 'cold' | 'partnership';
  status: 'new' | 'contacted' | 'nurturing' | 'converted' | 'lost';
  notes: string;
  converted_at: string | null;
  created_at: string;
}

const LEAD_TYPE_STYLE: Record<Lead['type'], string> = {
  inbound:     'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  cold:        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  partnership: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
};

const LEAD_STATUS_STYLE: Record<Lead['status'], string> = {
  new:       'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  contacted: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  nurturing: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  converted: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  lost:      'bg-muted text-muted-foreground',
};

const LEAD_STATUSES: Lead['status'][] = ['new', 'contacted', 'nurturing', 'converted', 'lost'];

const SOURCE_LABEL: Record<string, string> = {
  marketing_form: 'Form',
  manual:         'Manual',
  csv_import:     'CSV',
};

const RECIPIENT_STATUS_STYLE: Record<CampaignRecipient['status'], string> = {
  pending: 'bg-muted text-muted-foreground',
  sent:    'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  failed:  'bg-destructive/10 text-destructive',
};

interface AutomationRule {
  id: string;
  name: string;
  trigger_event: string;
  template_id: string;
  delay_minutes: number;
  is_active: boolean;
  created_at: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  'user.created':           'New user signup',
  'trial.ending_7d':        'Trial ending in 7 days',
  'trial.ending_3d':        'Trial ending in 3 days',
  'trial.ending_0d':        'Trial ending today',
  'payment.failed':         'Payment failed',
  'cart.abandoned':         'Abandoned cart',
  'lead.created':           'New lead from form (inbound)',
  'lead.cold_created':      'New cold lead (manual)',
  'upcoming.payment':       'Upcoming payment',
  'ai.cap_warning':         'AI quota warning',
  'subscription.cancelled': 'Subscription cancelled',
  'trial.reminder_cron':    'Trial reminder (cron)',
};

const TRIGGER_EVENTS = Object.keys(TRIGGER_LABELS);


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
function PreviewModal({ open, subject, html, onClose, onEdit }: {
  open: boolean; subject: string; html: string; onClose: () => void; onEdit?: () => void;
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
          <div className="flex items-center gap-2">
            {onEdit && (
              <button onClick={onEdit} className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors">
                <Pencil className="w-3.5 h-3.5" />Edit Template
              </button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <iframe srcDoc={html} sandbox="allow-same-origin"
            className="w-full h-[600px] rounded-lg border border-border bg-white" title="Email preview" />
        </div>
      </div>
    </div>
  );
}

// -- Variable mapping: derives template vars from a lead record -------------
function mapLeadToTemplateVars(
  lead: Lead,
  templateVars: string[],
): Record<string, string> {
  const today = new Date().toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const mappings: Record<string, string> = {
    contact_name:       `${lead.first_name} ${lead.last_name}`.trim(),
    organization_name:  lead.company ?? '',
    bank_name:          lead.company ?? '',
    program_name:       lead.company ?? '',
    org_program_type:   lead.notes   ?? '',
    original_send_date: today,
    first_name:         lead.first_name,
    last_name:          lead.last_name,
  };
  return Object.fromEntries(
    templateVars
      .filter((v) => v in mappings)
      .map((v) => [v, mappings[v]]),
  );
}

// -- Segment -> lead type mapping -------------------------------------------
const SEGMENT_LEAD_TYPE: Record<string, string> = {
  partnership_leads: 'partnership',
  cold_leads:        'cold',
};

function CampaignWizard({ open, onClose, templates, onCreated, onEditTemplate }: {
  open: boolean;
  onClose: () => void;
  templates: EmailTemplate[];
  onCreated: () => void;
  onEditTemplate?: (t: EmailTemplate) => void;
}) {
  // -- Core wizard state ----------------------------------------------------
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [loadingSegs, setLoadingSegs] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // -- Lead org-picker state (lead-based segments) --------------------------
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // -- Generic variable state (non-lead segments) ---------------------------
  const [templateVarValues, setTemplateVarValues] = useState<Record<string, string>>({});

  // -- Confirm step state ---------------------------------------------------
  const [campaignName, setCampaignName] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduledAt, setScheduledAt] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // -- Derived values -------------------------------------------------------
  const selectedSeg      = segments.find((s) => s.key === selectedSegment);
  const selectedTpl      = templates.find((t) => t.id === selectedTemplate);
  const segmentLeadType  = SEGMENT_LEAD_TYPE[selectedSegment] ?? null;
  const isLeadSegment    = segmentLeadType !== null;
  const hasGenericVars   = !isLeadSegment && (selectedTpl?.variables?.length ?? 0) > 0;

  type WizardStepKey = 'segment' | 'template' | 'organizations' | 'variables' | 'confirm';
  const STEPS: WizardStepKey[] = useMemo(() => {
    const s: WizardStepKey[] = ['segment', 'template'];
    if (isLeadSegment)   s.push('organizations');
    else if (hasGenericVars) s.push('variables');
    s.push('confirm');
    return s;
  }, [isLeadSegment, hasGenericVars]);

  const currentStep = STEPS[step - 1];
  const totalSteps  = STEPS.length;

  const filteredLeads = leads.filter((l) => {
    if (!orgSearch) return true;
    const q = orgSearch.toLowerCase();
    return (
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
      (l.email   ?? '').toLowerCase().includes(q) ||
      (l.company ?? '').toLowerCase().includes(q)
    );
  });

  const selectedLeadsList = Array.from(selectedLeadIds)
    .map((id) => leads.find((l) => l.id === id))
    .filter(Boolean) as Lead[];

  // -- Load segments on open ------------------------------------------------
  useEffect(() => {
    if (open && segments.length === 0) {
      setLoadingSegs(true);
      fetch('/api/proxy/admin/segments')
        .then((r) => r.json())
        .then((d) => setSegments(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setLoadingSegs(false));
    }
  }, [open]);

  // -- Load leads when entering org-picker step -----------------------------
  useEffect(() => {
    if (currentStep === 'organizations' && leads.length === 0 && !loadingLeads) {
      setLoadingLeads(true);
      fetch('/api/proxy/admin/leads')
        .then((r) => r.json())
        .then((d: Lead[]) => {
          const filtered = Array.isArray(d)
            ? d.filter((l) => l.type === segmentLeadType && l.status !== 'converted')
            : [];
          setLeads(filtered);
          setSelectedLeadIds(new Set(filtered.map((l) => l.id)));
        })
        .catch(() => {})
        .finally(() => setLoadingLeads(false));
    }
  }, [currentStep]);

  // -- Reset downstream state when segment or template changes --------------
  useEffect(() => {
    setLeads([]); setSelectedLeadIds(new Set()); setOrgSearch('');
  }, [selectedSegment]);

  useEffect(() => { setTemplateVarValues({}); }, [selectedTemplate]);

  // -- Handlers -------------------------------------------------------------
  function handleClose() {
    setStep(1);
    setSelectedSegment(''); setSelectedTemplate('');
    setLeads([]); setSelectedLeadIds(new Set()); setOrgSearch('');
    setTemplateVarValues({});
    setCampaignName('');
    setScheduleMode('now'); setScheduleDate(''); setScheduleTime('09:00'); setScheduledAt('');
    setPreviewOpen(false); setError('');
    onClose();
  }

  function handleNext() { setError(''); setStep((s) => s + 1); }
  function handleBack() { setError(''); setStep((s) => s - 1); }

  async function handlePreview() {
    if (!selectedTpl) return;
    // For lead campaigns, preview using the first selected lead's vars
    const previewVars = isLeadSegment && selectedLeadsList.length > 0
      ? mapLeadToTemplateVars(selectedLeadsList[0], selectedTpl.variables)
      : templateVarValues;
    setPreviewing(true);
    try {
      const res = await fetch('/api/proxy/admin/templates/' + selectedTpl.id + '/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: previewVars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Preview failed');
      setPreviewSubject(data.subject);
      setPreviewHtml(data.html);
      setPreviewOpen(true);
    } catch (e: any) { setError(e.message); }
    finally { setPreviewing(false); }
  }

  // Combine date + time into ISO string whenever either changes
  useEffect(() => {
    if (scheduleDate && scheduleTime) {
      setScheduledAt(scheduleDate + 'T' + scheduleTime);
    } else {
      setScheduledAt('');
    }
  }, [scheduleDate, scheduleTime]);

  async function doCreate(sendAfter: boolean) {
    if (!campaignName.trim()) { setError('Campaign name is required.'); return; }
    setSaving(true); setError('');
    try {
      let payload: Record<string, any> = {
        name:        campaignName.trim(),
        template_id: selectedTemplate,
        segment_key: selectedSegment,
        ...(scheduleMode === 'later' && scheduledAt ? { scheduled_at: scheduledAt } : {}),
      };

      if (isLeadSegment) {
        // Build per-recipient variable map from selected leads
        const recipientVariables: Record<string, Record<string, string>> = {};
        for (const lead of selectedLeadsList) {
          recipientVariables[lead.email] = mapLeadToTemplateVars(
            lead, selectedTpl?.variables ?? [],
          );
        }
        payload = {
          ...payload,
          recipient_variables: recipientVariables,
          recipient_filter:    selectedLeadsList.map((l) => l.email),
        };
      } else if (hasGenericVars && Object.keys(templateVarValues).length > 0) {
        payload = { ...payload, template_variables: templateVarValues };
      }

      const createRes = await fetch('/api/proxy/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const campaign = await createRes.json();
      if (!createRes.ok) throw new Error(campaign.message ?? 'Create failed');

      if (sendAfter) {
        setSending(true);
        const sendRes = await fetch('/api/proxy/admin/campaigns/' + campaign.id + '/send', { method: 'POST' });
        const sendData = await sendRes.json();
        if (!sendRes.ok) throw new Error(sendData.message ?? 'Send failed');
      }

      onCreated();
      handleClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); setSending(false); }
  }

  const nextDisabled =
    (currentStep === 'segment'       && !selectedSegment)  ||
    (currentStep === 'template'      && !selectedTemplate) ||
    (currentStep === 'organizations' && selectedLeadIds.size === 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">
              Step {step} of {totalSteps}
            </p>
            <h3 className="text-base font-semibold text-foreground">New Campaign</h3>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex px-6 pt-4 gap-2 flex-shrink-0">
          {STEPS.map((_, i) => (
            <div key={i} className={cn('flex-1 h-1 rounded-full transition-colors',
              i < step ? 'bg-primary' : 'bg-muted')} />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

          {/* ── Step: segment ────────────────────────────────────────────── */}
          {currentStep === 'segment' && (
            <>
              <p className="text-sm font-medium text-foreground">Choose audience segment</p>
              {loadingSegs ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading&hellip;</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {segments.map((seg) => (
                    <button key={seg.key} onClick={() => setSelectedSegment(seg.key)}
                      className={cn('w-full text-left rounded-xl border px-4 py-3 transition-colors',
                        selectedSegment === seg.key
                          ? 'border-primary bg-primary-light dark:bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted/30')}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{seg.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{seg.description}</p>
                        </div>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full ml-3 flex-shrink-0',
                          seg.count > 0
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-muted text-muted-foreground')}>
                          {seg.count} recipient{seg.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Step: template ───────────────────────────────────────────── */}
          {currentStep === 'template' && (
            <>
              <p className="text-sm font-medium text-foreground">Choose email template</p>
              {templates.filter((t) => t.is_active).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No active templates.</p>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {templates.filter((t) => t.is_active).map((t) => (
                    <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                      className={cn('w-full text-left rounded-xl border px-4 py-3 transition-colors',
                        selectedTemplate === t.id
                          ? 'border-primary bg-primary-light dark:bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted/30')}>
                      <p className="text-sm font-mono font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.subject}</p>
                      {t.description && <p className="text-xs text-muted-foreground/70 mt-0.5">{t.description}</p>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Step: organizations (lead-based picker) ──────────────────── */}
          {currentStep === 'organizations' && (
            <>
              <div>
                <p className="text-sm font-medium text-foreground mb-0.5">Select organizations</p>
                <p className="text-xs text-muted-foreground">
                  Variables are auto-filled from each lead record. Review before sending.
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder="Search by name, email or organization&hellip;"
                  className="pl-9"
                />
              </div>

              {/* Select all / counts */}
              <div className="flex items-center justify-between -mt-1">
                <p className="text-xs text-muted-foreground">
                  {selectedLeadIds.size} of {leads.length} selected
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedLeadIds(new Set(leads.map((l) => l.id)))}
                    className="text-xs text-primary hover:underline">Select all</button>
                  <span className="text-muted-foreground text-xs">&middot;</span>
                  <button onClick={() => setSelectedLeadIds(new Set())}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline">Deselect all</button>
                </div>
              </div>

              {loadingLeads ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading leads&hellip;</span>
                </div>
              ) : leads.length === 0 ? (
                <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No {segmentLeadType} leads found. Add leads from the Leads tab first.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {filteredLeads.map((lead) => {
                    const isSelected = selectedLeadIds.has(lead.id);
                    const vars = selectedTpl
                      ? mapLeadToTemplateVars(lead, selectedTpl.variables)
                      : {};
                    const hasEmptyVars = Object.values(vars).some((v) => !v);

                    return (
                      <label key={lead.id}
                        className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors',
                          isSelected
                            ? 'border-primary bg-primary-light dark:bg-primary/10'
                            : 'border-border hover:border-primary/30')}>
                        <input type="checkbox" checked={isSelected}
                          onChange={(e) => {
                            const next = new Set(selectedLeadIds);
                            if (e.target.checked) next.add(lead.id); else next.delete(lead.id);
                            setSelectedLeadIds(next);
                          }}
                          className="w-4 h-4 accent-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {lead.first_name} {lead.last_name}
                            </p>
                            {hasEmptyVars && isSelected && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 flex-shrink-0">
                                missing vars
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {lead.company ? `${lead.company} \u00b7 ` : ''}{lead.email}
                          </p>
                          {/* Variable preview — shown when selected */}
                          {isSelected && Object.keys(vars).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-1 gap-1">
                              {Object.entries(vars).map(([k, v]) => (
                                <div key={k} className="flex items-baseline gap-2 text-xs">
                                  <span className="font-mono text-muted-foreground/60 flex-shrink-0 min-w-[120px]">
                                    {`{{${k}}}`}
                                  </span>
                                  {v ? (
                                    <span className="text-foreground truncate">{v}</span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-400 italic">
                                      empty &mdash; update the lead
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                  {filteredLeads.length === 0 && orgSearch && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No results for &ldquo;{orgSearch}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Step: variables (non-lead segments) ──────────────────────── */}
          {currentStep === 'variables' && selectedTpl && (
            <>
              <p className="text-sm font-medium text-foreground">Fill in template variables</p>
              <p className="text-xs text-muted-foreground">
                These values are substituted into every email sent in this campaign.
              </p>
              <div className="space-y-3">
                {selectedTpl.variables.map((v) => (
                  <div key={v} className="space-y-1.5">
                    <Label className="text-xs font-mono text-muted-foreground">{`{{${v}}}`}</Label>
                    <Input value={templateVarValues[v] ?? ''}
                      onChange={(e) => setTemplateVarValues((p) => ({ ...p, [v]: e.target.value }))}
                      placeholder={`Enter ${v.replace(/_/g, ' ')}`} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Step: confirm ────────────────────────────────────────────── */}
          {currentStep === 'confirm' && (
            <>
              <p className="text-sm font-medium text-foreground">Name this campaign</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Campaign Name</Label>
                <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. BOF Partnership Wave 1" autoFocus />
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Segment</span>
                  <span className="font-medium text-foreground">{selectedSeg?.label}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Template</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground text-xs">{selectedTpl?.name}</span>
                    {onEditTemplate && selectedTpl && (
                      <button onClick={() => { onEditTemplate(selectedTpl); handleClose(); }}
                        className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded" title="Edit template">
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipients</span>
                  <span className="font-medium text-foreground">
                    {isLeadSegment ? selectedLeadIds.size : selectedSeg?.count ?? 0}
                    {isLeadSegment && ' organizations'}
                  </span>
                </div>
                {isLeadSegment && selectedLeadsList.length > 0 && (
                  <div className="pt-1 border-t border-border space-y-0.5">
                    {selectedLeadsList.map((l) => (
                      <p key={l.id} className="text-xs text-muted-foreground">
                        {l.first_name} {l.last_name}
                        {l.company ? ` \u00b7 ${l.company}` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview */}
              <button onClick={handlePreview} disabled={previewing}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium disabled:opacity-50">
                {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Preview email
                {isLeadSegment && selectedLeadsList.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    (using {selectedLeadsList[0].first_name}&apos;s variables)
                  </span>
                )}
              </button>

              {/* Schedule toggle */}
              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">When to send</p>
                <div className="flex gap-3">
                  {(['now', 'later'] as const).map((mode) => (
                    <button key={mode} onClick={() => setScheduleMode(mode)}
                      className={cn('flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                        scheduleMode === mode
                          ? 'border-primary bg-primary-light dark:bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50')}>
                      {mode === 'now' ? 'Send Now' : 'Schedule'}
                    </button>
                  ))}
                </div>
                {scheduleMode === 'later' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date</Label>
                      <input type="date" value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 10)}
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Time</Label>
                      <input type="time" value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary" />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border gap-3 flex-shrink-0">
          <Button variant="outline" onClick={step === 1 ? handleClose : handleBack} className="flex-shrink-0">
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <div className="flex gap-2">
            {currentStep !== 'confirm' ? (
              <Button onClick={handleNext} disabled={nextDisabled}>Next</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => doCreate(false)} disabled={saving}>
                  {saving && !sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
                </Button>
                <Button onClick={() => doCreate(true)} disabled={saving}>
                  {sending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending&hellip;</>
                    : scheduleMode === 'later'
                      ? <><Calendar className="w-4 h-4 mr-2" />Schedule</>
                      : <><Send className="w-4 h-4 mr-2" />Send Now</>
                  }
                </Button>
              </>
            )}
          </div>
        </div>

        <PreviewModal open={previewOpen} subject={previewSubject} html={previewHtml}
          onClose={() => setPreviewOpen(false)} />
      </div>
    </div>
  );
}

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
  const [currentPreviewTemplate, setCurrentPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  // ── Campaigns state ────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // ── Leads state ───────────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadStatusFilter, setLeadStatusFilter] = useState<Lead['status'] | ''>('');
  const [leadWizardOpen, setLeadWizardOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState({ first_name: '', last_name: '', email: '', company: '', phone: '', notes: '', status: 'new' as Lead['status'], type: 'inbound' as Lead['type'] });
  const [savingLead, setSavingLead] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [csvText, setCsvText] = useState('');
  const [importingCsv, setImportingCsv] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number } | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);


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

  const loadLeads = useCallback(async (status?: string) => {
    setLoadingLeads(true);
    try {
      const url = '/api/proxy/admin/leads' + (status ? '?status=' + status : '');
      const res = await fetch(url);
      if (res.ok) setLeads(await res.json());
    } catch { /* non-fatal */ }
    finally { setLoadingLeads(false); }
  }, []);


  const loadAutomations = useCallback(async () => {
    setLoadingAutomations(true);
    try {
      const res = await fetch('/api/proxy/admin/automations');
      if (res.ok) setAutomations(await res.json());
    } catch { /* non-fatal */ }
    finally { setLoadingAutomations(false); }
  }, []);


  useEffect(() => { loadTemplates(); }, [loadTemplates]);
  useEffect(() => { if (activeTab === 'campaigns') loadCampaigns(); }, [activeTab, loadCampaigns]);
  useEffect(() => { if (activeTab === 'leads') loadLeads(leadStatusFilter || undefined); }, [activeTab, loadLeads, leadStatusFilter]);
  useEffect(() => { if (activeTab === 'automations') loadAutomations(); }, [activeTab, loadAutomations]);

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
      setCurrentPreviewTemplate(t);
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

  async function handleDeleteTemplate(t: EmailTemplate) {
    if (!window.confirm(`Permanently delete "${t.name}"? This cannot be undone.`)) return;
    setDeletingTemplateId(t.id);
    try {
      const res = await fetch('/api/proxy/admin/templates/' + t.id + '/delete', { method: 'POST' });
      if (res.ok) setTemplates((prev) => prev.filter((item) => item.id !== t.id));
    } finally { setDeletingTemplateId(null); }
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

  // ── Automations state ─────────────────────────────────────────────────
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [loadingAutomations, setLoadingAutomations] = useState(true);
  const [autoWizardOpen, setAutoWizardOpen] = useState(false);
  const [autoForm, setAutoForm] = useState({ name: '', trigger_event: 'user.created', template_id: '', delay_minutes: 0 });
  const [savingAuto, setSavingAuto] = useState(false);
  const [autoError, setAutoError] = useState('');
  const [togglingAutoId, setTogglingAutoId] = useState<string | null>(null);
  const [deletingAutoId, setDeletingAutoId] = useState<string | null>(null);


  function openAddLead() {
    setEditingLead(null);
    setLeadForm({ first_name: '', last_name: '', email: '', company: '', phone: '', notes: '', status: 'new', type: 'inbound' });
    setLeadError(''); setLeadWizardOpen(true);
  }

  function openEditLead(l: Lead) {
    setEditingLead(l);
    setLeadForm({ first_name: l.first_name, last_name: l.last_name, email: l.email,
      company: l.company ?? '', phone: l.phone ?? '', notes: l.notes ?? '', status: l.status, type: l.type ?? 'inbound' });
    setLeadError(''); setLeadWizardOpen(true);
  }

  async function handleSaveLead() {
    if (!leadForm.first_name.trim()) { setLeadError('First name is required.'); return; }
    if (!leadForm.last_name.trim())  { setLeadError('Last name is required.'); return; }
    if (!leadForm.email.trim())      { setLeadError('Email is required.'); return; }
    setSavingLead(true); setLeadError('');
    try {
      if (editingLead) {
        const res = await fetch('/api/proxy/admin/leads/' + editingLead.id, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: leadForm.status, notes: leadForm.notes,
            first_name: leadForm.first_name, last_name: leadForm.last_name,
            company: leadForm.company, phone: leadForm.phone }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Update failed');
      } else {
        const res = await fetch('/api/proxy/admin/leads', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...leadForm }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Create failed');
      }
      await loadLeads(leadStatusFilter || undefined);
      setLeadWizardOpen(false); setEditingLead(null);
    } catch (e: any) { setLeadError(e.message); }
    finally { setSavingLead(false); }
  }

  async function handleDeleteLead(id: string) {
    setDeletingLeadId(id);
    try {
      const res = await fetch('/api/proxy/admin/leads/' + id, { method: 'DELETE' });
      if (res.ok) setLeads((prev) => prev.filter((l) => l.id !== id));
    } finally { setDeletingLeadId(null); }
  }

  async function handleCsvImport() {
    if (!csvText.trim()) return;
    setImportingCsv(true); setImportResult(null);
    try {
      const lines = csvText.trim().split('\n').filter(Boolean);
      const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        header.forEach((h, i) => { row[h] = vals[i] ?? ''; });
        return row;
      }).filter((r) => r.email);
      const res = await fetch('/api/proxy/admin/leads/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Import failed');
      setImportResult(data);
      await loadLeads(leadStatusFilter || undefined);
      setCsvText('');
    } catch (e: any) { setLeadError(e.message); }
    finally { setImportingCsv(false); }
  }

  // ── Automation actions ─────────────────────────────────────────────────
  async function handleSaveAuto() {
    if (!autoForm.name.trim())       { setAutoError('Name is required.'); return; }
    if (!autoForm.template_id.trim()) { setAutoError('Template is required.'); return; }
    setSavingAuto(true); setAutoError('');
    try {
      const res = await fetch('/api/proxy/admin/automations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Create failed');
      await loadAutomations();
      setAutoWizardOpen(false);
      setAutoForm({ name: '', trigger_event: 'user.created', template_id: '', delay_minutes: 0 });
    } catch (e: any) { setAutoError(e.message); }
    finally { setSavingAuto(false); }
  }

  async function handleToggleAuto(id: string) {
    setTogglingAutoId(id);
    try {
      const res = await fetch('/api/proxy/admin/automations/' + id + '/toggle', { method: 'POST' });
      const data = await res.json();
      if (res.ok) setAutomations((prev) => prev.map((a) => a.id === id ? { ...a, is_active: data.is_active } : a));
    } finally { setTogglingAutoId(null); }
  }

  async function handleDeleteAuto(id: string) {
    setDeletingAutoId(id);
    try {
      const res = await fetch('/api/proxy/admin/automations/' + id, { method: 'DELETE' });
      if (res.ok) setAutomations((prev) => prev.filter((a) => a.id !== id));
    } finally { setDeletingAutoId(null); }
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
              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Subject</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">From</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Updated</th>

                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-20">Status</th>
                      <th className="px-4 py-2.5 w-28" />
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
                            <button onClick={() => handleDeleteTemplate(t)} disabled={deletingTemplateId === t.id}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded" title="Delete permanently">
                              {deletingTemplateId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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
              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
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

        {/* ── Leads tab ── */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value as Lead['status'] | '')}
                  className="text-xs border border-border rounded-lg px-2 py-1 bg-card text-foreground outline-none focus:border-primary"
                >
                  <option value="">All statuses</option>
                  {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowCsvImport((v) => !v)} className="h-8 gap-1.5 text-xs">
                  CSV Import
                </Button>
                <Button size="sm" onClick={openAddLead} className="h-8 gap-1.5">
                  <Plus className="w-3.5 h-3.5" />Add Lead
                </Button>
              </div>
            </div>

            {/* CSV import panel */}
            {showCsvImport && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CSV Import</p>
                <p className="text-xs text-muted-foreground">
                  Paste CSV with header row. Required columns: <code className="bg-muted px-1 rounded">first_name, last_name, email</code>. Optional: <code className="bg-muted px-1 rounded">company, phone</code>
                </p>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={5}
                  placeholder={'first_name,last_name,email,company,phone\nJohn,Smith,john@acme.com,Acme Inc,416-555-0100'}
                  className="w-full font-mono text-xs border border-border rounded-lg px-3 py-2 bg-card text-foreground resize-y outline-none focus:border-primary"
                />
                {importResult && (
                  <p className="text-xs text-green-600 font-medium">
                    ✓ {importResult.imported} imported, {importResult.updated} updated
                  </p>
                )}
                <Button size="sm" onClick={handleCsvImport} disabled={importingCsv || !csvText.trim()} className="h-8">
                  {importingCsv ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Importing…</> : 'Import Rows'}
                </Button>
              </div>
            )}

            {loadingLeads ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading leads…</span>
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">No leads yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Leads from the marketing form appear here automatically. You can also add them manually or import via CSV.
                </p>
                <Button size="sm" onClick={openAddLead} className="mt-1 gap-1.5">
                  <Plus className="w-3.5 h-3.5" />Add First Lead
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">Email</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Company</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-20">Source</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-20">Type</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-24">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell w-24">Added</th>
                      <th className="px-4 py-2.5 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leads.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{l.first_name} {l.last_name}</p>
                          {l.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[160px]">{l.notes}</p>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-xs text-muted-foreground">{l.email}</p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-xs text-muted-foreground">{l.company || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {SOURCE_LABEL[l.source] ?? l.source}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', LEAD_TYPE_STYLE[l.type ?? 'inbound'])}>
                            {l.type ?? 'inbound'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', LEAD_STATUS_STYLE[l.status])}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-xs text-muted-foreground">{fmtDate(l.created_at)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openEditLead(l)}
                              className="text-muted-foreground hover:text-primary transition-colors p-1 rounded" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteLead(l.id)} disabled={deletingLeadId === l.id}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded" title="Delete">
                              {deletingLeadId === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add/Edit lead modal */}
            {leadWizardOpen && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h3 className="text-base font-semibold text-foreground">{editingLead ? 'Edit Lead' : 'Add Lead'}</h3>
                    <button onClick={() => setLeadWizardOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">First Name <span className="text-destructive">*</span></Label>
                        <Input value={leadForm.first_name} onChange={(e) => setLeadForm((p) => ({ ...p, first_name: e.target.value }))} placeholder="John" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Last Name <span className="text-destructive">*</span></Label>
                        <Input value={leadForm.last_name} onChange={(e) => setLeadForm((p) => ({ ...p, last_name: e.target.value }))} placeholder="Smith" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
                      <Input value={leadForm.email} onChange={(e) => setLeadForm((p) => ({ ...p, email: e.target.value }))} placeholder="john@company.com" disabled={!!editingLead} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Company</Label>
                        <Input value={leadForm.company} onChange={(e) => setLeadForm((p) => ({ ...p, company: e.target.value }))} placeholder="Acme Inc." />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Phone</Label>
                        <Input value={leadForm.phone} onChange={(e) => setLeadForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 416..." />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Lead Type</Label>
                      <select value={leadForm.type} onChange={(e) => setLeadForm((p) => ({ ...p, type: e.target.value as Lead['type'] }))}
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary">
                        <option value="inbound">Inbound - came via form or referral</option>
                        <option value="cold">Cold - manually added, send outreach email</option>
                        <option value="partnership">Partnership - government agency, fund, or organization</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <select value={leadForm.status} onChange={(e) => setLeadForm((p) => ({ ...p, status: e.target.value as Lead['status'] }))}
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary">
                        {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes</Label>
                      <textarea value={leadForm.notes} onChange={(e) => setLeadForm((p) => ({ ...p, notes: e.target.value }))} rows={3}
                        placeholder="Any relevant context about this lead…"
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                    </div>
                    {leadError && <p className="text-sm text-destructive">{leadError}</p>}
                    <div className="flex gap-3 pt-2 border-t border-border">
                      <Button variant="outline" onClick={() => setLeadWizardOpen(false)} className="flex-1">Cancel</Button>
                      <Button onClick={handleSaveLead} disabled={savingLead} className="flex-1">
                        {savingLead ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : editingLead ? 'Save Changes' : 'Add Lead'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ── Automations tab ── */}
        {activeTab === 'automations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{automations.length} rule{automations.length !== 1 ? 's' : ''}</p>
              <Button size="sm" onClick={() => { setAutoError(''); setAutoWizardOpen(true); }} className="h-8 gap-1.5">
                <Plus className="w-3.5 h-3.5" />New Rule
              </Button>
            </div>

            {loadingAutomations ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading rules…</span>
              </div>
            ) : automations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">No automation rules yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Wire any system event to an email template. Create a rule for <code className="bg-muted px-1 rounded text-[11px]">user.created</code> to send your welcome email automatically.
                </p>
                <Button size="sm" onClick={() => setAutoWizardOpen(true)} className="mt-1 gap-1.5">
                  <Plus className="w-3.5 h-3.5" />Create First Rule
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Rule Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Trigger</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Template ID</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-16 hidden md:table-cell">Delay</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-20">Status</th>
                      <th className="px-4 py-2.5 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {automations.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{a.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                            {a.trigger_event}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">{TRIGGER_LABELS[a.trigger_event] ?? a.trigger_event}</p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-xs font-mono text-muted-foreground truncate max-w-[160px]">{a.template_id}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-xs text-muted-foreground">{a.delay_minutes === 0 ? 'Instant' : `${a.delay_minutes}m`}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            a.is_active
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-muted text-muted-foreground')}>
                            {a.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleToggleAuto(a.id)} disabled={togglingAutoId === a.id}
                              className={cn('transition-colors p-1 rounded',
                                a.is_active ? 'text-muted-foreground hover:text-amber-500' : 'text-muted-foreground hover:text-green-600')}
                              title={a.is_active ? 'Deactivate' : 'Activate'}>
                              {togglingAutoId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : a.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => handleDeleteAuto(a.id)} disabled={deletingAutoId === a.id}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded" title="Delete">
                              {deletingAutoId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* New Rule modal */}
            {autoWizardOpen && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h3 className="text-base font-semibold text-foreground">New Automation Rule</h3>
                    <button onClick={() => setAutoWizardOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Rule Name <span className="text-destructive">*</span></Label>
                      <Input value={autoForm.name} onChange={(e) => setAutoForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Welcome on signup" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Trigger Event <span className="text-destructive">*</span></Label>
                      <select value={autoForm.trigger_event} onChange={(e) => setAutoForm((p) => ({ ...p, trigger_event: e.target.value }))}
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary">
                        {TRIGGER_EVENTS.map((t) => <option key={t} value={t}>{TRIGGER_LABELS[t]} ({t})</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email Template <span className="text-destructive">*</span></Label>
                      <select value={autoForm.template_id} onChange={(e) => setAutoForm((p) => ({ ...p, template_id: e.target.value }))}
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary">
                        <option value="">Select template…</option>
                        {templates.filter((t) => t.is_active).map((t) => (
                          <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>
                        ))}
                      </select>
                      {templates.filter((t) => t.is_active).length === 0 && (
                        <p className="text-xs text-amber-600">No active templates. Create and activate a template first.</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Delay (minutes) <span className="text-muted-foreground font-normal">— 0 = send immediately</span></Label>
                      <Input type="number" min={0} value={autoForm.delay_minutes}
                        onChange={(e) => setAutoForm((p) => ({ ...p, delay_minutes: parseInt(e.target.value) || 0 }))}
                        placeholder="0" />
                    </div>
                    <div className="rounded-xl bg-muted/30 border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">How it works:</span> When <span className="font-mono bg-muted px-1 rounded">{autoForm.trigger_event}</span> fires, this rule will send the selected template to the user involved in the event.
                      </p>
                    </div>
                    {autoError && <p className="text-sm text-destructive">{autoError}</p>}
                    <div className="flex gap-3 pt-2 border-t border-border">
                      <Button variant="outline" onClick={() => setAutoWizardOpen(false)} className="flex-1">Cancel</Button>
                      <Button onClick={handleSaveAuto} disabled={savingAuto} className="flex-1">
                        {savingAuto ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : 'Create Rule'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
