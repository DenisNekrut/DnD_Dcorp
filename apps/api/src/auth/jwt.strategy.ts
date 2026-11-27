import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface AuthenticatedUser {
  id: string;
  email: string;
  platformRole: 'USER' | 'ADMIN';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: { cookies?: Record<string, string> }) => request?.cookies?.dnd_session ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string }): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, platformRole: true, bannedAt: true, bannedUntil: true },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    if (user.bannedAt && (!user.bannedUntil || user.bannedUntil > new Date())) {
      throw new UnauthorizedException('This account is suspended. Contact portal support if you believe this is a mistake.');
    }
    return { id: user.id, email: user.email, platformRole: user.platformRole };
  }
}