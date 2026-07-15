import { prisma } from '@meg/database';
import { config } from '../../config';

/**
 * O MEG usa uma base financeira familiar compartilhada. Os logins continuam
 * individuais para auditoria e permissões, mas o estado financeiro pertence
 * ao administrador principal da instalação.
 */
export async function resolveSharedStateOwnerId(fallbackUserId: string) {
  const primaryAdmin = await prisma.user.findUnique({
    where: { email: config.adminEmail.trim().toLowerCase() },
    select: { id: true, appState: { select: { id: true } } }
  });

  if (primaryAdmin?.appState) return primaryAdmin.id;

  const adminWithState = await prisma.user.findFirst({
    where: { role: 'ADMIN', appState: { isNot: null } },
    orderBy: { createdAt: 'asc' },
    select: { id: true }
  });

  if (adminWithState) return adminWithState.id;
  if (primaryAdmin) return primaryAdmin.id;

  const firstActiveAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN', status: 'ACTIVE', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true }
  });

  return firstActiveAdmin?.id ?? fallbackUserId;
}
