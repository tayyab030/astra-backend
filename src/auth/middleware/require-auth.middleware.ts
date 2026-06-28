import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { AuthService } from '../auth.service';
import { routeRequiresAuth } from '../protected-routes.config';
import { AuthenticatedRequest } from '../types/authenticated-request';

function extractAccessToken(req: AuthenticatedRequest): string | undefined {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('JWT ')) {
    return authorization.slice(4).trim();
  }
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7).trim();
  }

  const cookieToken = req.cookies?.access;
  return typeof cookieToken === 'string' ? cookieToken : undefined;
}

@Injectable()
export class RequireAuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const url = req.originalUrl ?? req.url;
    if (!routeRequiresAuth(url)) {
      return next();
    }

    const token = extractAccessToken(req);
    if (!token) {
      return res.status(401).json({
        detail: 'Authentication credentials were not provided.',
        code: 'not_authenticated',
      });
    }

    try {
      req.user = this.authService.verifyAccessToken(token);
      return next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return res.status(401).json(error.getResponse());
      }
      return next(error);
    }
  }
}
