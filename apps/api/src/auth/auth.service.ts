import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.module';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim();
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Email or username is already in use');

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: { email, username, passwordHash },
      select: { id: true, email: true, username: true, platformRole: true, createdAt: true },
    });
    return { user, token: await this.createSessionToken(user.id, user.email) };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.bannedAt && (!user.bannedUntil || user.bannedUntil > new Date())) {
      throw new UnauthorizedException('This account is suspended. Contact portal support if you believe this is a mistake.');
    }
    return {
      user: { id: user.id, email: user.email, username: user.username, platformRole: user.platformRole, createdAt: user.createdAt },
      token: await this.createSessionToken(user.id, user.email),
    };
  }

  createSessionToken(userId: string, email: string): Promise<string> {
    return this.jwt.signAsync({
      sub: userId,
      email,
    });
  }
}