import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

/**
 * AuthModule
 *
 * Registers the JwtStrategy for Clerk JWT validation via JWKS.
 * Imported into AppModule.
 *
 * The JwtAuthGuard is registered globally in AppModule via APP_GUARD,
 * not here — so it does not need to be exported from this module.
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtStrategy],
})
export class AuthModule {}
