import { Request } from 'express';

export type AuthenticatedUser = {
  sub: string;
  email: string;
  /** Auth session id (access token `sid`) — used for device list / revoke. */
  sid?: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
