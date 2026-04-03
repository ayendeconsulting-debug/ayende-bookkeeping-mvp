import { IsArray, IsEnum, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LegalDocumentType, AcceptanceSource } from '../../entities/user-agreement.entity';

export class AcceptLegalDocumentDto {
  @IsEnum(['terms_of_service', 'terms_of_use', 'privacy_policy', 'cookie_policy'])
  document_type: LegalDocumentType;

  @IsString()
  document_version: string;

  @IsEnum(['signup', 'onboarding', 're_acceptance'])
  acceptance_source: AcceptanceSource;
}

export class AcceptLegalDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcceptLegalDocumentDto)
  documents: AcceptLegalDocumentDto[];
}
