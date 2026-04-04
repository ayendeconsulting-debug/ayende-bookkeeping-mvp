import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LegalService } from './legal.service';
import { AcceptLegalDto } from './dto/accept-legal.dto';
import { SkipLegalCheck } from './skip-legal-check.decorator';

@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  /**
   * POST /legal/accept
   * Record acceptance of one or more legal documents for the authenticated user.
   * Body: { documents: [{ document_type, document_version, acceptance_source }] }
   *
   * Idempotent — re-posting the same document+version has no effect.
   * @SkipLegalCheck — must be accessible even when re-acceptance is required.
   */
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @SkipLegalCheck()
  async accept(@Body() body: AcceptLegalDto, @Req() req: any) {
    const userId: string = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    const result = await this.legalService.accept(userId, body.documents);
    return {
      success: true,
      saved: result.saved,
      message:
        result.saved > 0
          ? `${result.saved} agreement(s) recorded`
          : 'Already accepted — no changes made',
    };
  }

  /**
   * GET /legal/acceptance-status
   * Return the current acceptance status for the authenticated user.
   * Used by the frontend and the LegalAcceptanceGuard to check for re-acceptance.
   *
   * @SkipLegalCheck — frontend needs this to render the re-acceptance page.
   *
   * Response shape:
   * {
   *   all_accepted: boolean,
   *   requires_reacceptance: boolean,
   *   documents: [{ document_type, current_version, accepted_version, is_current }]
   * }
   */
  @Get('acceptance-status')
  @SkipLegalCheck()
  async getAcceptanceStatus(@Req() req: any) {
    const userId: string = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.legalService.getAcceptanceStatus(userId);
  }
}
