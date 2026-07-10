# Implanta��o: Supabase + Render + GitHub Pages

## Arquitetura

- GitHub Pages: interface React.
- Render: API Fastify p�blica.
- Supabase: PostgreSQL persistente.

O banco SQLite antigo permanece como backup e s� � lido pelo importador.

## 1. Obter a conex�o do Supabase

No Supabase, abra **Project Settings ? Database ? Connect** e selecione **Session pooler**. Copie a URI PostgreSQL e substitua apenas a senha indicada pelo painel.

N�o envie a URI ou a senha em conversas e n�o salve esses valores no GitHub.

## 2. Criar a API no Render

1. No Render, escolha **New ? Blueprint**.
2. Conecte `MarcosVilalva/MEG-Platform`.
3. O arquivo `render.yaml` criar� `meg-platform-api`.
4. Em `DATABASE_URL`, cole a URI do Session Pooler do Supabase.
5. O `JWT_SECRET` � gerado automaticamente.
6. Aguarde `/health` responder com `status: ok`.

O primeiro acesso pode demorar cerca de um minuto no plano gratuito ap�s inatividade.

## 3. Apontar o site para a API

No GitHub, abra **Settings ? Secrets and variables ? Actions ? Variables** e crie:

- Nome: `VITE_API_URL`
- Valor: URL HTTPS exibida pelo Render, sem barra no final.

Execute novamente o workflow **Deploy MEG Platform to GitHub Pages**.

## 4. Importar o SQLite antigo (opcional e �nica vez)

Fa�a uma c�pia do arquivo `dev.db`. Configure localmente, sem versionar:

```env
DATABASE_URL="URI_DO_SUPABASE"
LEGACY_DATABASE_URL="file:./prisma/dev.db"
```

Depois execute:

```powershell
npm run db:generate
npm run db:generate:legacy
npm run db:push
npm run db:migrate:supabase
```

O importador usa os mesmos IDs e opera��es idempotentes, permitindo repetir a execu��o se ela for interrompida.

## Seguran�a

- Nunca use a chave `service_role` no frontend.
- Nunca coloque senha do banco em `VITE_*`.
- Restrinja o CORS ao endere�o do GitHub Pages.
- Preserve o SQLite e o JSON original at� conferir saldos e quantidades no Supabase.
