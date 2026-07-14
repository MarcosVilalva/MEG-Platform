import { randomBytes } from 'node:crypto';

export function normalizeAccountEmail(value: string) {
  return value.trim().replace(/[?？]+$/u, '').toLowerCase();
}

export function createTemporaryPassword(bytes = randomBytes(8)) {
  const token = bytes.toString('hex').slice(0, 12);
  return `Meg#${token}9a`;
}

export function passwordResetMessages(target: { name: string }, temporaryPassword: string, requestedByAdmin = false) {
  const origin = requestedByAdmin ? 'O administrador redefiniu sua senha.' : 'Uma nova senha temporária foi solicitada para sua conta.';
  const whatsappOrigin = requestedByAdmin ? 'Senha redefinida pelo administrador' : 'Senha redefinida';
  return {
    subject: requestedByAdmin ? 'MEG Finanças: sua senha temporária' : 'MEG Finanças: nova senha temporária',
    emailText: `Olá, ${target.name}.\n\n${origin}\n\nSenha temporária: ${temporaryPassword}\n\nEntre no MEG com esta senha. Por segurança, não a compartilhe.\n\nMEG Finanças — Segurança e controle.`,
    whatsappText: `🔑 *MEG Finanças — ${whatsappOrigin}*\n\nOlá, *${target.name}*! Sua nova senha temporária é:\n\n*${temporaryPassword}*\n\nEntre no MEG e não compartilhe esta senha.\n\n🤖 MEG Finanças — Segurança e controle.`
  };
}
