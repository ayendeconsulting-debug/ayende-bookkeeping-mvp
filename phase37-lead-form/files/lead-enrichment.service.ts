import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Lead, EnrichmentStatus } from './lead.entity';
import { LlmService } from '../ai/services/llm.service';

interface ApolloPerson {
  name?: string;
  title?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  organization?: {
    name?: string;
    estimated_num_employees?: number;
    industry?: string;
  };
}

interface ApolloEnrichment {
  company:  string | null;
  title:    string | null;
  size:     string | null;
  location: string | null;
  linkedin: string | null;
  industry: string | null;
}

interface IntentResult {
  intent:    'demo' | 'pricing' | 'info' | 'support' | 'unknown';
  urgency:   'immediate' | '30days' | 'exploring' | 'unknown';
  qualified: boolean;
  summary:   string;
}

interface ScoreResult {
  score:              number;
  reason:             string;
  recommended_action: string;
  drafted_reply:      string;
}

@Injectable()
export class LeadEnrichmentService {
  private readonly logger = new Logger(LeadEnrichmentService.name);
  private readonly resend: Resend;

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
  ) {
    const resendKey = this.configService.get<string>('RESEND_API_KEY') ?? '';
    this.resend = new Resend(resendKey);
  }

  async enrichLead(leadId: string): Promise<void> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });
    if (!lead) {
      this.logger.warn(`Lead ${leadId} not found - skipping enrichment`);
      return;
    }

    this.logger.log(`Enriching lead ${leadId} (${lead.email})`);

    let apollo: ApolloEnrichment = {
      company: null, title: null, size: null,
      location: null, linkedin: null, industry: null,
    };
    let apolloFailed = false;
    let apolloError: string | null = null;

    try {
      const result = await this.callApollo(lead.email);
      if (result) apollo = result;
    } catch (err) {
      apolloFailed = true;
      apolloError  = (err as Error).message;
      this.logger.warn(`Apollo enrichment failed for ${lead.email}: ${apolloError} - continuing with form data only`);
    }

    let intent: IntentResult;
    try {
      intent = await this.extractIntent(lead, apollo);
    } catch (err) {
      this.logger.error(`Intent extraction failed for ${leadId}: ${(err as Error).message}`);
      throw err;
    }

    let scoreResult: ScoreResult;
    try {
      scoreResult = await this.scoreLead(lead, apollo, intent);
    } catch (err) {
      this.logger.error(`Scoring failed for ${leadId}: ${(err as Error).message}`);
      throw err;
    }

    lead.enriched_company   = apollo.company;
    lead.enriched_title     = apollo.title;
    lead.enriched_size      = apollo.size;
    lead.enriched_location  = apollo.location;
    lead.enriched_linkedin  = apollo.linkedin;
    lead.intent             = intent.intent;
    lead.urgency            = intent.urgency;
    lead.score              = scoreResult.score;
    lead.score_reason       = scoreResult.reason;
    lead.recommended_action = scoreResult.recommended_action;
    lead.enriched_at        = new Date();
    lead.enrichment_status  = 'complete' as EnrichmentStatus;
    lead.enrichment_error   = apolloFailed ? `Apollo: ${apolloError}` : null;
    await this.leadRepo.save(lead);

    try {
      await this.sendEmailAlert(lead, scoreResult);
    } catch (err) {
      this.logger.error(`Email alert failed for ${leadId}: ${(err as Error).message}`);
    }

    if (scoreResult.score >= 8) {
      try {
        await this.sendSmsAlert(lead, scoreResult);
      } catch (err) {
        this.logger.error(`SMS alert failed for ${leadId}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`Lead ${leadId} enriched - score=${scoreResult.score}`);
  }

  private async callApollo(email: string): Promise<ApolloEnrichment | null> {
    const apiKey = this.configService.get<string>('APOLLO_API_KEY');
    if (!apiKey) throw new Error('APOLLO_API_KEY not configured');

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://api.apollo.io/v1/people/match', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Cache-Control': 'no-cache',
          'x-api-key':     apiKey,
        },
        body:   JSON.stringify({ email, reveal_personal_emails: false }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Apollo HTTP ${response.status}`);

      const data   = await response.json() as { person?: ApolloPerson };
      const person = data.person;
      if (!person) return null;

      const locationParts = [person.city, person.state, person.country].filter(Boolean);
      const sizeNum       = person.organization?.estimated_num_employees;
      const sizeBand      = sizeNum
        ? sizeNum < 10   ? '1-10'
        : sizeNum < 50   ? '11-50'
        : sizeNum < 200  ? '51-200'
        : sizeNum < 1000 ? '201-1000'
        : '1000+'
        : null;

      return {
        company:  person.organization?.name ?? null,
        title:    person.title ?? null,
        size:     sizeBand,
        location: locationParts.length > 0 ? locationParts.join(', ') : null,
        linkedin: person.linkedin_url ?? null,
        industry: person.organization?.industry ?? null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async extractIntent(lead: Lead, apollo: ApolloEnrichment): Promise<IntentResult> {
    const systemPrompt = `You analyze inbound demo requests for Tempo Books, a Canadian SaaS bookkeeping platform. Extract intent, urgency, and qualification from the lead's submitted information. Respond with ONLY valid JSON, no preamble.`;

    const userPrompt = `Analyze this demo request.

<lead_data>
Name: ${lead.first_name} ${lead.last_name}
Email: ${lead.email}
Title (form): ${lead.title ?? '(not provided)'}
Title (enriched): ${apollo.title ?? '(not available)'}
Company (form): ${lead.company ?? '(not provided)'}
Company (enriched): ${apollo.company ?? '(not available)'}
Company size (enriched): ${apollo.size ?? '(not available)'}
Industry (enriched): ${apollo.industry ?? '(not available)'}
Message: ${lead.notes ?? '(no message)'}
UTM source: ${lead.utm_source ?? '(none)'}
UTM campaign: ${lead.utm_campaign ?? '(none)'}
</lead_data>

Return ONLY this JSON:
{
  "intent": "demo" | "pricing" | "info" | "support" | "unknown",
  "urgency": "immediate" | "30days" | "exploring" | "unknown",
  "qualified": true | false,
  "summary": "<one sentence describing what they want>"
}`;

    const raw = await this.llmService.complete(systemPrompt, userPrompt);
    return this.parseJson<IntentResult>(raw, {
      intent: 'unknown', urgency: 'unknown', qualified: false,
      summary: 'Could not parse intent from message.',
    });
  }

  private async scoreLead(
    lead: Lead,
    apollo: ApolloEnrichment,
    intent: IntentResult,
  ): Promise<ScoreResult> {
    const systemPrompt = `You are a sales qualification expert for Tempo Books, a Canadian bookkeeping SaaS targeting freelancers, SMBs, and accounting firms. Score inbound leads 1-10 on likelihood to convert to paying customer within 60 days. Weight: urgency 40%, company fit 30%, qualification 30%. A score of 8+ means call within 1 hour. Respond with ONLY valid JSON.`;

    const userPrompt = `Score this lead.

<lead>
Name: ${lead.first_name} ${lead.last_name}
Email: ${lead.email}
Title: ${apollo.title ?? lead.title ?? 'Unknown'}
Company: ${apollo.company ?? lead.company ?? 'Unknown'}
Company size: ${apollo.size ?? 'Unknown'}
Location: ${apollo.location ?? 'Unknown'}
Industry: ${apollo.industry ?? 'Unknown'}
Intent: ${intent.intent}
Urgency: ${intent.urgency}
Qualified: ${intent.qualified}
Summary: ${intent.summary}
Message: ${lead.notes ?? '(no message)'}
</lead>

Return ONLY this JSON:
{
  "score": <integer 1-10>,
  "reason": "<one sentence explaining the score>",
  "recommended_action": "<call within 1 hour | email within 24h | nurture sequence | disqualify>",
  "drafted_reply": "<a 4-sentence personalized first-touch reply from Ade at Tempo Books. Reference the company specifically. Propose a 15-min call. End with: 'Book a time: https://adeehinmidu.com/book'>"
}`;

    const raw = await this.llmService.complete(systemPrompt, userPrompt);
    return this.parseJson<ScoreResult>(raw, {
      score:              5,
      reason:             'Could not parse score from AI response - manual review needed.',
      recommended_action: 'email within 24h',
      drafted_reply:      'Hi - thanks for reaching out about Tempo Books. I would love to learn more about your bookkeeping needs. Could we book 15 minutes? Book a time: https://adeehinmidu.com/book',
    });
  }

  private parseJson<T>(raw: string, fallback: T): T {
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(clean) as T;
    } catch {
      this.logger.warn('Failed to parse JSON from Claude - returning fallback');
      return fallback;
    }
  }

  private async sendEmailAlert(lead: Lead, result: ScoreResult): Promise<void> {
    const to      = this.configService.get<string>('LEAD_ALERT_EMAIL') ?? 'hello@gettempo.ca';
    const cc      = this.configService.get<string>('LEAD_ALERT_EMAIL_CC');
    const tier    = result.score >= 8 ? '[HOT]' : result.score >= 5 ? '[WARM]' : '[COLD]';
    const subject = `[${result.score}/10] ${tier} ${lead.first_name} ${lead.last_name} - ${lead.enriched_company ?? lead.company ?? 'Unknown'}`;
    const html    = this.buildEmailHtml(lead, result);

    await this.resend.emails.send({
      from: 'Tempo Books <noreply@gettempo.ca>',
      to,
      ...(cc ? { cc: [cc] } : {}),
      subject,
      html,
    });
  }

  private buildEmailHtml(lead: Lead, result: ScoreResult): string {
    const tier         = result.score >= 8 ? '[HOT]' : result.score >= 5 ? '[WARM]' : '[COLD]';
    const badgeColor   = result.score >= 8 ? '#C53030' : result.score >= 5 ? '#D69E2E' : '#718096';
    const greenBrand   = '#0F6E56';
    const displayTitle = lead.enriched_title ?? lead.title ?? null;

    const titleRow = displayTitle
      ? `<tr><td style="padding:6px 0;color:#718096;">Title</td><td style="padding:6px 0;text-align:right;">${displayTitle}</td></tr>`
      : `<tr><td style="padding:6px 0;color:#718096;">Title</td><td style="padding:6px 0;text-align:right;">-</td></tr>`;

    const linkedinRow = lead.enriched_linkedin
      ? `<tr><td style="padding:6px 0;color:#718096;">LinkedIn</td><td style="padding:6px 0;text-align:right;"><a href="${lead.enriched_linkedin}" style="color:${greenBrand};">View profile</a></td></tr>`
      : '';

    const notesRow = lead.notes
      ? `<tr><td style="padding:6px 0;color:#718096;vertical-align:top;">Message</td><td style="padding:6px 0;text-align:right;color:#2d3748;">${lead.notes}</td></tr>`
      : '';

    return `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <div style="background:${greenBrand};color:white;padding:20px;border-radius:12px 12px 0 0;">
    <div style="display:inline-block;background:${badgeColor};color:white;padding:6px 14px;border-radius:999px;font-weight:700;font-size:14px;margin-bottom:8px;">${tier} ${result.score}/10</div>
    <h1 style="margin:8px 0 4px 0;font-size:22px;font-weight:700;">${lead.first_name} ${lead.last_name}</h1>
    <p style="margin:0;font-size:14px;opacity:0.9;">${lead.enriched_company ?? lead.company ?? 'Unknown company'}</p>
  </div>
  <div style="background:white;padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
    <p style="margin:0 0 16px 0;font-size:14px;color:#4a5568;"><strong>Why this score:</strong> ${result.reason}</p>
    <p style="margin:0 0 16px 0;font-size:14px;color:#4a5568;"><strong>Recommended action:</strong> ${result.recommended_action}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <tr><td style="padding:6px 0;color:#718096;">Email</td><td style="padding:6px 0;text-align:right;"><a href="mailto:${lead.email}" style="color:${greenBrand};text-decoration:none;">${lead.email}</a></td></tr>
      ${titleRow}
      <tr><td style="padding:6px 0;color:#718096;">Size</td><td style="padding:6px 0;text-align:right;">${lead.enriched_size ?? '-'}</td></tr>
      <tr><td style="padding:6px 0;color:#718096;">Location</td><td style="padding:6px 0;text-align:right;">${lead.enriched_location ?? '-'}</td></tr>
      <tr><td style="padding:6px 0;color:#718096;">Intent</td><td style="padding:6px 0;text-align:right;">${lead.intent ?? '-'} / ${lead.urgency ?? '-'}</td></tr>
      ${linkedinRow}
      ${notesRow}
    </table>
    <div style="background:#f7fafc;padding:16px;border-radius:8px;margin:16px 0;">
      <p style="margin:0 0 8px 0;font-size:12px;color:#718096;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Drafted reply</p>
      <p style="margin:0;font-size:13px;color:#2d3748;line-height:1.5;white-space:pre-line;">${result.drafted_reply}</p>
    </div>
    <p style="margin:16px 0 0 0;font-size:11px;color:#a0aec0;text-align:center;">Tempo Books - Lead Enrichment Engine - Score generated by Claude</p>
  </div>
</div>`;
  }

  private async sendSmsAlert(lead: Lead, result: ScoreResult): Promise<void> {
    const sid   = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const from  = this.configService.get<string>('TWILIO_FROM_NUMBER');
    const to    = this.configService.get<string>('LEAD_ALERT_SMS_TO');

    if (!sid || !token || !from || !to) {
      this.logger.warn('Twilio not fully configured - skipping SMS alert');
      return;
    }

    const twilioModule = await import('twilio');
    const twilioClient = twilioModule.default(sid, token);
    const company      = (lead.enriched_company ?? lead.company ?? 'Unknown').substring(0, 30);
    const action       = result.recommended_action.substring(0, 40);
    const body         = `[HOT] ${result.score}/10 - ${lead.first_name} ${lead.last_name} @ ${company}. ${action}`;

    await twilioClient.messages.create({ from, to, body: body.substring(0, 160) });
  }
}
