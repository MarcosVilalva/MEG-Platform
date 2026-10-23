import { createServer } from 'node:http';
if (process.env.NODE_ENV !== 'test'
  || !process.env.DATABASE_URL?.includes('@127.0.0.1:5432/meg')
  || !process.env.MEG_CAPTURE_KEY
  || process.env.BREVO_API_KEY !== 'isolated-brevo-fixture-not-a-real-key') {
  throw new Error('Test-only transport guard refused unsafe environment');
}
const originalFetch = globalThis.fetch.bind(globalThis);
const messages = [];
globalThis.fetch = async (input, options) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url !== 'https://api.brevo.com/v3/smtp/email') {
    if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//u.test(url)) {
      throw new Error('Test-only adapter blocked external network destination');
    }
    return originalFetch(input, options);
  }
  const data = JSON.parse(String(options?.body || '{}'));
  if (data.to?.length !== 1 || data.to[0]?.email !== 'homolog.pr643@example.test') {
    throw new Error('Recipient is not the single allowed fictional mailbox');
  }
  const password = /Senha temporária:\s*(Meg#[0-9a-f]+9a)/u.exec(String(data.textContent || ''))?.[1];
  if (!password || !String(data.subject).includes('senha temporária')) {
    throw new Error('Expected real password-reset message was not generated');
  }
  messages.push({ password, recipient: data.to[0].email });
  return new Response(JSON.stringify({ messageId: 'isolated-transport-capture' }), {
    status: 201, headers: { 'Content-Type': 'application/json' }
  });
};
const server = createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  if (req.headers['x-meg-test-capture-key'] !== process.env.MEG_CAPTURE_KEY) {
    res.writeHead(403).end(JSON.stringify({ error:'FORBIDDEN' }));
    return;
  }
  if (req.url !== '/messages' || req.method !== 'GET') {
    res.writeHead(404).end(JSON.stringify({ error:'NOT_FOUND' }));
    return;
  }
  res.writeHead(200).end(JSON.stringify(messages));
});
server.listen(3999, '127.0.0.1');
server.unref();
