import type { Request } from 'express';

export type Role = 'admin' | 'procurement_officer' | 'finance_officer' | 'evaluator' | 'viewer';

export interface AuthUser {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}
