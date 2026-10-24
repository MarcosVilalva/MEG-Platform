# MEG | Protocolo de construção usando abi/screenshot-to-code

## Escopo e status
- Laboratório separado: branch `poc/meg-web-screenshot-to-code-seletor`; **PR #648 permanece Draft em `b36f21c2980ec6f4188428760bd120edd6b58979`**, sem mudanças financeiras nesta preparação.
- **Upstream pinado e executado** em GitHub Actions: `abi/screenshot-to-code@a8139779f7c5ae231b7f2a86fa7f83ddc5f7badc`; execução real da interface e upload sintético aprovados em [40116923283](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/40116923283).
- **Geração com LLM NÃO realizada:** credencial de um provedor não disponível nesta sessão e cobrança não autorizada explicitamente; nenhum código deve ser atribuído à ferramenta até existir saída verificável.
- O arquivo ZIP privado `MEG-S2C-ENTRADAS-OFICIAIS.zip` entregue no chat contém dois PNGs fornecidos pelo usuário, de 1672×941, além dos prompts. **Não comitar** PNGs com informações de UI/conta nem credenciais em repositório.

## Setup isolado no Codespace privado, após configurar o secret do provedor
```bash
mkdir -p /workspaces/meg-s2c-lab
cd /workspaces/meg-s2c-lab
git clone https://github.com/abi/screenshot-to-code.git
cd screenshot-to-code
git checkout --detach a8139779f7c5ae231b7f2a86fa7f83ddc5f7badc
cd backend
poetry install --no-interaction --no-root --only main
poetry run playwright install chromium
poetry run uvicorn main:app --host 127.0.0.1 --port 7001
```
Em outro terminal:
```bash
cd /workspaces/meg-s2c-lab/screenshot-to-code/frontend
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
```
Abrir a porta privada 5173 do Codespace. **Nunca configurar encaminhamento público de 5173/7001** quando tiver imagem oficial, credenciais ou dados pessoais.

## Secrets e custos
- O projeto upstream exige **uma** chave: `GEMINI_API_KEY`, `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY`. A assinatura de ChatGPT/Codex não fornece automaticamente crédito no provedor via API.
- Criar em GitHub > Settings > Codespaces > Secrets > New secret (ou mecanismo de organização autorizado), limitar acesso ao Codespace/repositório correto e reiniciar o Codespace para propagação.
- **Nunca** inserir a chave no chat, `.env` versionado, logs, README ou capturas. Não acionar geração paga antes de autorização de custo.
- O backend upstream possui `GENERATION_MAX_COST_USD = 3.0` como teto por geração/variante, mas modelos sem preço registrado não são limitados por esse mecanismo. Não presumir que o limite evita toda cobrança.

## Uso real
1. Abrir a aplicação no navegador privado; verificar conexão FastAPI, provedor configurado e screenshot preview disponível.
2. Carregar SOMENTE `Nono lançamento.png` em etapa A. Escolher `React + Tailwind`. Colar `PROMPT-SELETOR.md` e executar a geração; registrar modelo, data, custo exibido (se disponível) e resultados. O gerador pode retornar código inexato.
3. Exportar a saída bruta para `/workspaces/meg-s2c-lab/exports/seletor`, sem mesclá-la à aplicação.
4. Repetir para `Novo lançamento financeiro neon.png`, com `PROMPT-FORMULARIO.md`, saída em `.../exports/formulario`.
5. Executar as duas propostas em navegador e comparar suas capturas reais em 1672×941 com os dois PNGs originais; verificar 1366×768, 1024×600, 910×400, 390×844.
6. Se a proposta tiver campos falsas, status pagos não suportados, APIs inventadas, mock de saldo ou sobreposição sobre screenshot, **descartar essa parte**. Transferir somente composição/estilos revisados para código React/TypeScript existente.
7. Integrar à PR #648 somente após revisão do diff e preservação de `financeClient.createEvent`, catálogos por workspace, status servidor, idempotência e exceções HTTP. Rodar CI + QA Fastify/PostgreSQL Playwright no mesmo SHA final. Não liberar Android ou serviços futuros.
8. Entregar um PNG único de alta resolução com comparativo lado a lado do original × construção, com identificação do método. Visual continua sem homologação até aprovação explícita.

## Fonte da verdade
- `docs/MEG-WEB-FINANCIAL-AUTHORITY.md` e `MEG-WEB-CONTINUIDADE-OFICIAL.md` do HEAD PR #648.
- Regras financeiras > print oficial > Prompt Master.
- Apenas Receita (status final servidor) e Despesa pendente (sem débito) estão operacionais na PR #648. Demais writers não devem ser simulados.
