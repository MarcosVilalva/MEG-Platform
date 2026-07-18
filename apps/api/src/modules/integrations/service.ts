import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { prisma } from '@meg/database';
import { config } from '../../config';
import { resolveWorkspaceContext } from '../workspaces/service';

const key = createHash('sha256').update(config.integrationEncryptionKey).digest();

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

function decrypt(value?: string | null) {
  if (!value) return null;
  const [iv, tag, encrypted] = value.split('.');
  if (!iv || !tag || !encrypted) throw new Error('INVALID_ENCRYPTED_INTEGRATION_KEY');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
}

export async function workspaceIntegrationForUser(userId: string) {
  const context = await resolveWorkspaceContext(userId);
  const stored = await prisma.workspaceNotificationConfig.findUnique({ where: { workspaceId: context.workspaceId } });
  return {
    workspaceId: context.workspaceId,
    whatsappEnabled: stored?.whatsappEnabled ?? false,
    evolutionApiUrl: stored?.evolutionApiUrl ?? '',
    evolutionInstance: stored?.evolutionInstance ?? '',
    evolutionApiKeyConfigured: Boolean(stored?.evolutionApiKeyEncrypted),
    emailEnabled: stored?.emailEnabled ?? true,
    replyToEmail: stored?.replyToEmail ?? '',
    senderName: stored?.senderName ?? 'MEG Finanças',
    usesMegFallback: true,
    managedWhatsapp: true
  };
}

export async function saveWorkspaceIntegration(userId: string, input: {
  whatsappEnabled: boolean;
  evolutionApiUrl?: string;
  evolutionInstance?: string;
  evolutionApiKey?: string;
  emailEnabled: boolean;
  replyToEmail?: string;
  senderName?: string;
}) {
  const context = await resolveWorkspaceContext(userId);
  if (context.membership.role !== 'ADMIN') throw new Error('WORKSPACE_ADMIN_REQUIRED');
  const current = await prisma.workspaceNotificationConfig.findUnique({ where: { workspaceId: context.workspaceId } });
  const apiKey = input.evolutionApiKey?.trim();
  const data = {
    whatsappEnabled: input.whatsappEnabled,
    evolutionApiUrl: input.evolutionApiUrl?.trim().replace(/\/$/, '') || null,
    evolutionInstance: input.evolutionInstance?.trim() || null,
    ...(apiKey ? { evolutionApiKeyEncrypted: encrypt(apiKey) } : {}),
    emailEnabled: input.emailEnabled,
    replyToEmail: input.replyToEmail?.trim().toLowerCase() || null,
    senderName: input.senderName?.trim() || 'MEG Finanças'
  };
  if (input.whatsappEnabled && (!data.evolutionApiUrl || !data.evolutionInstance || (!apiKey && !current?.evolutionApiKeyEncrypted))) {
    throw new Error('WHATSAPP_CONFIGURATION_INCOMPLETE');
  }
  const saved = await prisma.workspaceNotificationConfig.upsert({
    where: { workspaceId: context.workspaceId },
    create: { workspaceId: context.workspaceId, ...data, evolutionApiKeyEncrypted: apiKey ? data.evolutionApiKeyEncrypted : null },
    update: data
  });
  await prisma.auditLog.create({ data: { userId, entity: 'WorkspaceNotificationConfig', entityId: saved.id, action: 'UPDATE', metadata: JSON.stringify({ whatsappEnabled: saved.whatsappEnabled, emailEnabled: saved.emailEnabled, evolutionInstance: saved.evolutionInstance }) } });
  return workspaceIntegrationForUser(userId);
}

export async function workspaceWhatsappCredentials(userId: string) {
  const context = await resolveWorkspaceContext(userId);
  const stored = await prisma.workspaceNotificationConfig.findUnique({ where: { workspaceId: context.workspaceId } });
  if (!stored?.whatsappEnabled || !stored.evolutionApiUrl || !stored.evolutionInstance || !stored.evolutionApiKeyEncrypted) return null;
  return { apiUrl: stored.evolutionApiUrl, instance: stored.evolutionInstance, apiKey: decrypt(stored.evolutionApiKeyEncrypted)! };
}

export async function sendWorkspaceWhatsApp(userId: string, number: string, text: string) {
  const credentials = await workspaceWhatsappCredentials(userId);
  if (!credentials) return null;
  const response = await fetch(`${credentials.apiUrl}/message/sendText/${encodeURIComponent(credentials.instance)}`, {
    method: 'POST', headers: { apikey: credentials.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: number.replace(/\D/g, ''), text })
  });
  if (!response.ok) throw new Error(`WhatsApp do cliente recusado (${response.status}): ${await response.text()}`);
  return { status: 'sent', provider: 'workspace-evolution', detail: await response.text() };
}