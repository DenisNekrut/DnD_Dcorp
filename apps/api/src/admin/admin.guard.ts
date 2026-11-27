import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

type AdminRequest = Request & { user: AuthenticatedUser };

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (request.user?.platformRole !== 'ADMIN') {
      throw new ForbiddenException('Portal administrator access is required');
    }
    return true;
  }
}
