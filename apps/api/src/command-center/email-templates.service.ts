import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from './email-template.entity';

export interface CreateTemplateDto {
  name: string;
  description?: string;
  subject: string;
  html_body: string;
  from_email?: string;
  from_name?: string;
  variables?: string[];
}

export interface UpdateTemplateDto {
  description?: string;
  subject?: string;
  html_body?: string;
  from_email?: string;
  from_name?: string;
  variables?: string[];
  is_active?: boolean;
}

@Injectable()
export class EmailTemplatesService {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly repo: Repository<EmailTemplate>,
  ) {}

  findAll(): Promise<EmailTemplate[]> {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: string): Promise<EmailTemplate> {
    const template = await this.repo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async findByName(name: string): Promise<EmailTemplate | null> {
    return this.repo.findOne({ where: { name } });
  }

  async create(dto: CreateTemplateDto): Promise<EmailTemplate> {
    const existing = await this.repo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Template name "${dto.name}" already exists`);
    }
    const template = this.repo.create({
      ...dto,
      version: 1,
      is_active: true,
      variables: dto.variables ?? [],
    });
    return this.repo.save(template);
  }

  async update(id: string, dto: UpdateTemplateDto): Promise<EmailTemplate> {
    const template = await this.findOne(id);
    Object.assign(template, dto);
    // Increment version on every content-affecting save
    if (
      dto.subject !== undefined ||
      dto.html_body !== undefined ||
      dto.from_email !== undefined ||
      dto.from_name !== undefined
    ) {
      template.version = template.version + 1;
    }
    return this.repo.save(template);
  }

  async deactivate(id: string): Promise<{ success: boolean }> {
    const template = await this.findOne(id);
    template.is_active = false;
    await this.repo.save(template);
    return { success: true };
  }

  async reactivate(id: string): Promise<{ success: boolean }> {
    const template = await this.findOne(id);
    template.is_active = true;
    await this.repo.save(template);
    return { success: true };
  }

  async preview(
    id: string,
    sampleVars: Record<string, string>,
  ): Promise<{ subject: string; html: string }> {
    const template = await this.findOne(id);
    return {
      subject: this.renderVars(template.subject, sampleVars),
      html: this.renderVars(template.html_body, sampleVars),
    };
  }

  // ── Shared renderer used by AutomationsService in Phase 23d ──────────────
  renderVars(content: string, vars: Record<string, string>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }
}
