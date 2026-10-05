import { createHash, randomBytes } from 'node:crypto';

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


export function createPasswordResetToken(bytes = randomBytes(32)) {
  const token = bytes.toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

export function passwordResetLink(token: string) {
  const base = 'https://marcosvilalva.github.io/MEG-Platform/evolution.html';
  return `${base}#reset=${encodeURIComponent(token)}`;
}

export function passwordResetLinkMessages(target: { name: string }, link: string) {
  return {
    subject: 'MEG Finanças: redefina sua senha',
    emailText: `Olá, ${target.name}.\n\nRecebemos uma solicitação para redefinir sua senha do MEG Finanças.\n\nAbra este link para criar uma nova senha:\n${link}\n\nO link expira em 20 minutos e só pode ser usado uma vez. Se você não solicitou a redefinição, ignore esta mensagem. Sua senha atual continua válida.\n\nMEG Finanças — Segurança e controle.`,
    whatsappText: `🔐 *MEG Finanças — Redefinição de senha*\n\nOlá, *${target.name}*. Abra o link abaixo para criar uma nova senha:\n\n${link}\n\nO link expira em 20 minutos e só pode ser usado uma vez. Se você não solicitou, ignore esta mensagem.\n\n🤖 MEG Finanças — Segurança e controle.`
  };
}
