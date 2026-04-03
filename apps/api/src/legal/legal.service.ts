import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAgreement } from '../entities/user-agreement.entity';
import { AcceptLegalDocumentDto } from './dto/accept-legal.dto';
import {
  LEGAL_VERSIONS,
  ALL_DOCUMENT_TYPES,
  LegalDocumentType,
} from './legal-versions';

export interface AcceptanceStatusItem {
  document_type: LegalDocumentType;
  current_version: string;
  accepted_version: string | null;
  is_current: boolean;
}

export interface AcceptanceStatus {
  all_accepted: boolean;
  requires_reacceptance: boolean;
  documents: AcceptanceStatusItem[];
}

@Injectable()
export class LegalService {
  constructor(
    @InjectRepository(UserAgreement)
    private readonly agreementRepo: Repository<UserAgreement>,
  ) {}

  /**
   * Record one or more legal document acceptances for a user.
   * Uses upsert logic — if the same (user_id, document_type, document_version)
   * already exists the row is skipped to prevent duplicates.
   */
  async accept(
    userId: string,
    documents: AcceptLegalDocumentDto[],
  ): Promise<{ saved: number }> {
    let saved = 0;

    for (const doc of documents) {
      const existing = await this.agreementRepo.findOne({
        where: {
          user_id: userId,
          document_type: doc.document_type,
          document_version: doc.document_version,
        },
      });

      if (!existing) {
        const agreement = this.agreementRepo.create({
          user_id: userId,
          document_type: doc.document_type,
          document_version: doc.document_version,
          acceptance_source: doc.acceptance_source,
        });
        await this.agreementRepo.save(agreement);
        saved++;
      }
    }

    return { saved };
  }

  /**
   * Return the acceptance status for a user.
   * Compares the latest accepted version per document type against
   * the current LEGAL_VERSIONS constants.
   * Returns requires_reacceptance: true if any document is out of date.
   */
  async getAcceptanceStatus(userId: string): Promise<AcceptanceStatus> {
    // Get the most recently accepted version per document type for this user
    const agreements = await this.agreementRepo
      .createQueryBuilder('ua')
      .where('ua.user_id = :userId', { userId })
      .orderBy('ua.accepted_at', 'DESC')
      .getMany();

    // Build a map: document_type -> latest accepted version
    const latestAccepted = new Map<LegalDocumentType, string>();
    for (const agreement of agreements) {
      if (!latestAccepted.has(agreement.document_type)) {
        latestAccepted.set(agreement.document_type, agreement.document_version);
      }
    }

    const documents: AcceptanceStatusItem[] = ALL_DOCUMENT_TYPES.map((docType) => {
      const currentVersion = LEGAL_VERSIONS[docType];
      const acceptedVersion = latestAccepted.get(docType) ?? null;
      const isCurrent = acceptedVersion === currentVersion;

      return {
        document_type: docType,
        current_version: currentVersion,
        accepted_version: acceptedVersion,
        is_current: isCurrent,
      };
    });

    const allAccepted = documents.every((d) => d.is_current);

    return {
      all_accepted: allAccepted,
      requires_reacceptance: !allAccepted,
      documents,
    };
  }
}
