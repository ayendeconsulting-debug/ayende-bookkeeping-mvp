'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Plus, Pencil, Eye, X, Loader2, CheckCircle2,
  ToggleLeft, ToggleRight, ChevronDown, Megaphone, Users, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  variables: string; // comma-separated string in form, parsed on save
}

const EMPTY_FORM: TemplateFormState = {
  name: '',
  description: '',
  subject: '',
  html_body: '',
  from_email: 'admin@gettempo.ca',
  from_name: 'Tempo Books',
  variables: '',
};

const TABS = [
  { id: 'templates',   label: 'Templates',   icon: Mail,       ready: true  },
  { id: 'campaigns',   label: 'Campaigns',   icon: Megaphone,  ready: false },
  { id: 'leads',       label: 'Leads',       icon: Users,      ready: false },
  { id: 'automations', label: 'Automations', icon: Zap,        ready: false },
];

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function parseVars(raw: string): string[] {
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// â”€â”€ Slide-over panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SlideOver({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />
      {/* panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 w-full max-w-2xl bg-card border-l border-border z-50',
          'flex flex-col shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">{children}</div>
      </div>
    </>
  );
}

// â”€â”€ Preview modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PreviewModal({
  open,
  subject,
  html,
  onClose,
}: {
  open: boolean;
  subject: string;
  html: string;
  onClose: () => void;
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
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <iframe
            srcDoc={html}
            sandbox="allow-same-origin"
            className="w-full h-[600px] rounded-lg border border-border bg-white"
            title="Email preview"
          />
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Template form fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TemplateForm({
  form,
  onChange,
  saving,
  error,
  onSave,
  onPreview,
  previewing,
  isEdit,
}: {
  form: TemplateFormState;
  onChange: (patch: Partial<TemplateFormState>) => void;
  saving: boolean;
  error: string;
  onSave: () => void;
  onPreview: () => void;
  previewing: boolean;
  isEdit: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Name â€” read-only on edit */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          Template Name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. signup_welcome"
          className="font-mono text-sm"
          disabled={isEdit}
        />
        {isEdit && (
          <p className="text-xs text-muted-foreground">Name cannot be changed after creation.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Internal label for this template"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">From Email</Label>
          <Input
            value={form.from_email}
            onChange={(e) => onChange({ from_email: e.target.value })}
            placeholder="admin@gettempo.ca"
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">From Name</Label>
          <Input
            value={form.from_name}
            onChange={(e) => onChange({ from_name: e.target.value })}
            placeholder="Tempo Books"
            className="text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          Subject <span className="text-destructive">*</span>
        </Label>
        <Input
          value={form.subject}
          onChange={(e) => onChange({ subject: e.target.value })}
          placeholder="Welcome to Tempo Books â€” you're in"
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{'{{variable_name}}'}</code> for dynamic content.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          HTML Body <span className="text-destructive">*</span>
        </Label>
        <textarea
          value={form.html_body}
          onChange={(e) => onChange({ html_body: e.target.value })}
          rows={14}
          placeholder={'<!DOCTYPE html>\n<html>\n<body>\n  <p>Hi {{first_name}},</p>\n</body>\n</html>'}
          className={cn(
            'w-full font-mono text-xs border border-border rounded-lg px-3 py-2',
            'bg-card text-foreground resize-y outline-none',
            'focus:border-primary focus:ring-1 focus:ring-primary',
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Variables (comma-separated)</Label>
        <Input
          value={form.variables}
          onChange={(e) => onChange({ variables: e.target.value })}
          placeholder="first_name, plan_name, trial_end_date"
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          List every variable used in this template. Used to generate preview inputs.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pt-2 border-t border-border">
        <Button onClick={onSave} disabled={saving} className="flex-1">
          {saving
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Savingâ€¦</>
            : isEdit ? 'Save Changes' : 'Create Template'}
        </Button>
        <Button
          variant="outline"
          onClick={onPreview}
          disabled={previewing || !form.id}
          title={!form.id ? 'Save template first to preview' : 'Preview rendered email'}
        >
          {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

// â”€â”€ Variable preview input builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PreviewVarsInput({
  vars,
  sampleVars,
  onChange,
}: {
  vars: string[];
  sampleVars: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  if (vars.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 mb-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sample values for preview</p>
      <div className="grid grid-cols-2 gap-2">
        {vars.map((v) => (
          <div key={v} className="space-y-1">
            <Label className="text-[11px] font-mono text-muted-foreground">{`{{${v}}}`}</Label>
            <Input
              value={sampleVars[v] ?? ''}
              onChange={(e) => onChange(v, e.target.value)}
              placeholder={`Sample ${v}`}
              className="h-7 text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// â”€â”€ Main export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function CommandCenterClient() {
  const [activeTab, setActiveTab] = useState('templates');

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFormState & { id?: string }>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [sampleVars, setSampleVars] = useState<Record<string, string>>({});

  // Toggling state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // â”€â”€ Load templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/admin/templates');
      if (res.ok) setTemplates(await res.json());
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // â”€â”€ Open slide-over â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setSampleVars({});
    setSlideOpen(true);
  }

  function openEdit(t: EmailTemplate) {
    setEditingId(t.id);
    setForm({
      id: t.id,
      name: t.name,
      description: t.description ?? '',
      subject: t.subject,
      html_body: t.html_body,
      from_email: t.from_email ?? 'admin@gettempo.ca',
      from_name: t.from_name ?? 'Tempo Books',
      variables: (t.variables ?? []).join(', '),
    });
    setFormError('');
    setSampleVars({});
    setSlideOpen(true);
  }

  function closeSlide() {
    setSlideOpen(false);
    setEditingId(null);
  }

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleSave() {
    if (!form.name.trim()) { setFormError('Template name is required.'); return; }
    if (!form.subject.trim()) { setFormError('Subject is required.'); return; }
    if (!form.html_body.trim()) { setFormError('HTML body is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        subject: form.subject.trim(),
        html_body: form.html_body,
        from_email: form.from_email.trim() || 'admin@gettempo.ca',
        from_name: form.from_name.trim() || 'Tempo Books',
        variables: parseVars(form.variables),
      };
      const url = editingId
        ? `/api/proxy/admin/templates/${editingId}`
        : '/api/proxy/admin/templates';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Save failed');
      await loadTemplates();
      closeSlide();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // â”€â”€ Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handlePreview() {
    const id = editingId ?? form.id;
    if (!id) return;
    setPreviewing(true);
    try {
      const res = await fetch(`/api/proxy/admin/templates/${id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: sampleVars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Preview failed');
      setPreviewSubject(data.subject);
      setPreviewHtml(data.html);
      setPreviewOpen(true);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setPreviewing(false);
    }
  }

  // Quick preview from table row (no slide-over, uses empty sample vars)
  async function handleQuickPreview(t: EmailTemplate) {
    setPreviewing(true);
    try {
      const res = await fetch(`/api/proxy/admin/templates/${t.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: {} }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Preview failed');
      setPreviewSubject(data.subject);
      setPreviewHtml(data.html);
      setPreviewOpen(true);
    } catch { /* non-fatal */ }
    finally { setPreviewing(false); }
  }

  // â”€â”€ Toggle active/inactive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleToggle(t: EmailTemplate) {
    setTogglingId(t.id);
    try {
      const action = t.is_active ? 'delete' : 'reactivate';
      const method = t.is_active ? 'DELETE' : 'POST';
      const url = t.is_active
        ? `/api/proxy/admin/templates/${t.id}`
        : `/api/proxy/admin/templates/${t.id}/reactivate`;
      const res = await fetch(url, { method });
      if (res.ok) {
        setTemplates((prev) =>
          prev.map((item) =>
            item.id === t.id ? { ...item, is_active: !t.is_active } : item,
          ),
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
              Email templates, campaigns, leads, and automation rules â€” no deploy needed.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border -mx-6 px-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                  !tab.ready && 'opacity-50 cursor-not-allowed',
                )}
                disabled={!tab.ready}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {!tab.ready && (
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-semibold ml-1">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">

        {/* â”€â”€ Templates tab â”€â”€ */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {templates.length} template{templates.length !== 1 ? 's' : ''}
              </p>
              <Button size="sm" onClick={openNew} className="h-8 gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                New Template
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading templatesâ€¦</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">No templates yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Create your first email template. All future emails will be sent from here, no code changes needed.
                </p>
                <Button size="sm" onClick={openNew} className="mt-1 gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Create First Template
                </Button>
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
                          {t.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[160px]">{t.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-xs text-foreground truncate">{t.subject}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-xs text-muted-foreground">{t.from_email || 'â€”'}</p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-xs text-muted-foreground">{fmtDate(t.updated_at)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-muted-foreground">v{t.version}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            t.is_active
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-muted text-muted-foreground',
                          )}>
                            {t.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleQuickPreview(t)}
                              className="text-muted-foreground hover:text-primary transition-colors p-1 rounded"
                              title="Preview"
                              disabled={previewing}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEdit(t)}
                              className="text-muted-foreground hover:text-primary transition-colors p-1 rounded"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggle(t)}
                              disabled={togglingId === t.id}
                              className={cn(
                                'transition-colors p-1 rounded',
                                t.is_active
                                  ? 'text-muted-foreground hover:text-amber-500'
                                  : 'text-muted-foreground hover:text-green-600',
                              )}
                              title={t.is_active ? 'Deactivate' : 'Reactivate'}
                            >
                              {togglingId === t.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : t.is_active
                                  ? <ToggleRight className="w-3.5 h-3.5" />
                                  : <ToggleLeft className="w-3.5 h-3.5" />
                              }
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

        {/* â”€â”€ Placeholder tabs â”€â”€ */}
        {activeTab !== 'templates' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            {activeTab === 'campaigns' && <Megaphone className="w-10 h-10 text-muted-foreground/40" />}
            {activeTab === 'leads' && <Users className="w-10 h-10 text-muted-foreground/40" />}
            {activeTab === 'automations' && <Zap className="w-10 h-10 text-muted-foreground/40" />}
            <p className="text-sm font-medium text-foreground capitalize">{activeTab} â€” Coming in Phase 23</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {activeTab === 'campaigns' && 'Broadcast to any segment â€” all active users, trial users, specific plans, and more.'}
              {activeTab === 'leads' && 'Capture, track, and nurture leads from your marketing site through to conversion.'}
              {activeTab === 'automations' && 'Wire any system event to any email template, with optional delay. No code needed.'}
            </p>
          </div>
        )}
      </div>

      {/* â”€â”€ Slide-over â”€â”€ */}
      <SlideOver
        open={slideOpen}
        title={editingId ? 'Edit Template' : 'New Template'}
        onClose={closeSlide}
      >
        {/* Variable preview inputs â€” only show if editing existing template with variables */}
        {editingId && parseVars(form.variables).length > 0 && (
          <PreviewVarsInput
            vars={parseVars(form.variables)}
            sampleVars={sampleVars}
            onChange={(key, value) => setSampleVars((prev) => ({ ...prev, [key]: value }))}
          />
        )}
        <TemplateForm
          form={form}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          saving={saving}
          error={formError}
          onSave={handleSave}
          onPreview={handlePreview}
          previewing={previewing}
          isEdit={!!editingId}
        />
      </SlideOver>

      {/* â”€â”€ Preview modal â”€â”€ */}
      <PreviewModal
        open={previewOpen}
        subject={previewSubject}
        html={previewHtml}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}

