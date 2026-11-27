import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedUser } from './jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type AuthRequest = Request & { user: AuthenticatedUser };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(dto);
    this.setSessionCookie(response, result.token);
    return { user: result.user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto);
    this.setSessionCookie(response, result.token);
    return { user: result.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('dnd_session', this.cookieOptions());
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    const token = await this.auth.createSessionToken(request.user.id, request.user.email);
    this.setSessionCookie(response, token);
    return { user: request.user };
  }

  private setSessionCookie(response: Response, token: string): void {
    response.cookie('dnd_session', token, {
      ...this.cookieOptions(),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private cookieOptions() {
    const sameSite = this.config.get<'lax' | 'strict' | 'none'>('COOKIE_SAME_SITE') ?? 'lax';
    const secure = this.config.get<string>('COOKIE_SECURE') === 'true';
    if (sameSite === 'none' && !secure) {
      throw new Error('COOKIE_SECURE=true is required when COOKIE_SAME_SITE=none');
    }
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
    };
  }
}
