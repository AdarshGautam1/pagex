import { supabaseAdmin } from '../lib/supabase';

interface AuditEventParams {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent({
  userId = null,
  action,
  entityType,
  entityId,
  metadata = {},
}: AuditEventParams): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });

    if (error) {
      console.error('Failed to record audit log:', error.message);
    }
  } catch (err) {
    console.error('Unexpected error in audit logger:', err);
  }
}
