import { query } from '../db.js';
import type { AuthUser } from '../types.js';

export async function audit(user: AuthUser | undefined, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}, ip?: string) {
  if (!user) return;
  await query(
    `insert into audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata, ip_address)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [user.organization_id, user.id, action, entityType, entityId ?? null, metadata, ip ?? null]
  );
}
