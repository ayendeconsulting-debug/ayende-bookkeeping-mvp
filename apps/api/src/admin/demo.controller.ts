import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DemoGuard } from './demo.guard';
import { Request } from 'express';

/**
 * DemoController
 *
 * Provides a lightweight check endpoint for the frontend to determine
 * whether the current user has demo or admin platform access.
 *
 * GET /demo/check → 200 if platform_role is 'demo' or 'admin'
 *                 → 403 otherwise (regular users, no platform role)
 *
 * This is intentionally separate from AdminController so that demo users
 * never touch any admin-guarded surface.
 */
@Controller('demo')
@UseGuards(AuthGuard('jwt'), DemoGuard)
export class DemoController {
  /** GET /demo/check — verify demo or admin access */
  @Get('check')
  check(@Req() req: Request) {
    const platformRole = (req.user as any)?.platform_role ?? 'demo';
    return {
      access: true,
      role: platformRole,
      is_admin: platformRole === 'admin',
    };
  }
}
