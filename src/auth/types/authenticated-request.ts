import { Request } from 'express';

export type AuthenticatedUser = {
  sub: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
