# MEG Simples na Nuvem

Esta é a arquitetura oficial do MEG para uso pessoal diário.

## Produto

- A interface, os módulos e os cálculos são os do aplicativo original.
- O navegador mantém uma cópia local rápida.
- O Supabase PostgreSQL guarda o estado oficial de cada usuário.
- O backend existente fornece login, aprovação de acesso e sincronização.
- Nenhuma planilha ou dado financeiro pessoal é publicado no GitHub.

## Importação da base

Em **Ajustes > Importar base MEG**, selecione a planilha `.xlsx`.
O aplicativo reconhece e preserva:

- DATA e DiaSemana;
- TP LANÇAMENTO e DESCRIÇÃO;
- RECEITA e DESPESA;
- CLASSIFICAÇÃO DA DESPESA e GRUPO;
- FORMA DE PAGAMENTO, SITUAÇÃO e MODALIDADE;
- OBSERVAÇÕES.

Antes de substituir a base na nuvem, o aplicativo mostra a quantidade e os totais para confirmação.

## Alertas automáticos

O resumo diário inclui contas vencidas e contas que vencem nos próximos três dias.

Variáveis do Render para e-mail:

- `RESEND_API_KEY`
- `NOTIFICATION_EMAIL_FROM`
- `ADMIN_EMAIL` (padrão: `m_vilalva@hotmail.com`)

Variáveis do Render para WhatsApp via Evolution API:

- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`
- `WHATSAPP_RECIPIENT` (DDD + número, somente dígitos)

Ativação da automação:

1. Copie o valor de `NOTIFICATION_CRON_SECRET` do Render.
2. Crie no GitHub o segredo de Actions com o mesmo nome e valor.
3. O workflow `MEG Smart Notifications` executará nos horários descritos abaixo.

## Agenda inteligente de alertas

- Faturas de cartão são agrupadas por cartão e vencimento antes do envio.
- Às 06:00 são enviadas contas vencidas e dos próximos três dias.
- Às 12:00 e 19:00 são repetidas apenas contas vencidas e com vencimento no dia, desde que ainda não estejam pagas.
- A cada cinco dias, o envio das 06:00 traz todas as contas abertas e o total restante.
- O administrador cadastra números de WhatsApp e e-mails adicionais em **Ajustes > Alertas de vencimento**.
- O workflow `MEG Smart Notifications` depende do segredo `NOTIFICATION_CRON_SECRET` no GitHub Actions, com o mesmo valor configurado no Render.

## Segurança

- novos usuários solicitam acesso e aguardam aprovação;
- senhas precisam ser repetidas no cadastro;
- o estado financeiro é separado por usuário;
- gravações usam controle de revisão para evitar sobrescrever alterações feitas em outro dispositivo;
- arquivos `.xlsx`, `.xls`, `.xlsm`, `.csv` e `real-data.js` são ignorados pelo Git.
