import { prisma } from './prisma';
import logger from './logger';

export async function auditLog(params: {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        ip: params.ip,
        userAgent: params.userAgent,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    logger.error({ error, action: params.action }, 'Audit log error');
  }
}
