import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { BusinessesModule } from '../businesses/businesses.module';

/**
 * AuthModule
 *
 * Registers the JwtStrategy for Clerk JWT validation via JWKS.
 * Imports BusinessesModule so JwtStrategy can resolve clerk_org_id → business UUID.
 *
 * The JwtAuthGuard is registered globally in AppModule via APP_GUARD.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    BusinessesModule,
  ],
  providers: [JwtStrategy],
})
export class AuthModule {}
