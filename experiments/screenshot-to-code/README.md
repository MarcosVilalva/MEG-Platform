# PoC isolada | Screenshot to Code | MEG Novo Lançamento - seletor

## Situação e limites
Base congelada: PR #648 no commit `96f4acd0daec61aa8384f877fdc1e8c72d8e32e4`. Esta branch serve exclusivamente para experimentação. Não é PR de integração, não altera a aplicação ou os writers do MEG e não autoriza merge/deploy. A tela operacional ainda carece de homologação visual humana.

Ferramenta upstream: https://github.com/abi/screenshot-to-code (licença MIT). O README atual do upstream declara backend FastAPI, frontend React/Vite e necessidade de pelo menos uma chave de provedor OpenAI, Anthropic ou Gemini. Executar geração pode gerar cobrança. **Não houve execução do motor nesta rodada**: sem chave de modelo configurada e sem acesso ao terminal Codespaces na sessão.

## Preparar no Codespaces (com aprovação para usar créditos de API)

```bash
# Trabalhar fora da árvore do MEG, para não poluir o monorepo
mkdir -p /workspaces/meg-s2c-lab
cd /workspaces/meg-s2c-lab
git clone https://github.com/abi/screenshot-to-code.git
cd screenshot-to-code
# Seguir as instruções do README do repositório upstream.
# NÃO inserir chaves no Git, no README ou em PRs.
```

Configurar uma chave de API como **secret do Codespace**, nunca adicioná-la aos arquivos rastreados. Não copiar .env para a árvore MEG. Sem chave, a execução real do conversor para a imagem oficial fica bloqueada.

Na interface do conversor, carregar apenas `Imagem do ChatGPT 3 de out. de 2026, 17_31_26.png` do Projeto e usar as instruções de `PROMPT-SELETOR.md`. Exportar resultado para uma pasta experimental descartável. **Não substituir** `NewLaunchForm.tsx` nem `new-launch.css` diretamente. Não copiar ou recriar logo e montanhas ausentes como assets independentes autorizados.

## Validação exigida
- Primeiro somente etapa A, seletor dos quatro tipos. Despesa/Receita podem avançar visualmente; Transferência/Benefício desabilitados.
- Comparação frente ao print oficial de 1672×941, e responsividade 1366×768, 1024×600, 910×400 e 390×844.
- Uma área de rolagem, sem overflow horizontal; foco, Tab/Shift+Tab, Esc e retorno ao gatilho.
- Sem mock financeiro apresentado como dado real. Sem criar evento, saldo, parcela, pagamento ou transferência.
- Só após revisão humana do PoC estudar integração no React existente, com catálogos autorizados via API e writer financeiro canônico.
- No momento de integrar: novo commit, CI, QA real Fastify + PostgreSQL descartável no **mesmo SHA final** da PR #648.
- Android, main, PR #647, domínio financeiro, dados reais e deploy de produção intocados.

## Material de comparação
Um protótipo HTML/CSS/JS independente, escrito manualmente para verificar a geometria do print e **não produzido pelo Screenshot to Code**, e suas capturas de 5 viewports foram entregues como ZIP nesta conversa. Esse protótipo serve apenas como comparação inicial e **não** demonstra que o conversor gerou código.

Checkpoint oficial na PR #648 permanece `MEG-WEB-CONTINUIDADE-OFICIAL.md`; registrar aprovação humana separadamente antes de qualquer merge.


## Validação isolada de instalação no GitHub Actions (24/10/2026)

- Workflow experimental: `.github/workflows/meg-s2c-isolated-smoke.yml`, disparado exclusivamente na branch `poc/meg-web-screenshot-to-code-seletor`. Não toca PR #648, `main`, lockfiles, Android nem writers.
- Upstream pinado exatamente em `abi/screenshot-to-code@a8139779f7c5ae231b7f2a86fa7f83ddc5f7badc` (commit de 09/10/2026). Esse hash foi obtido e lido no GitHub antes de instalar.
- Runtime do smoke: Node.js 22, pnpm 10.32.1 conforme `frontend/package.json`, Python 3.11, Poetry conforme README/pyproject; backend FastAPI na porta **7001** e frontend Vite **5173**, ambos somente em **127.0.0.1** no runner.
- Resultado inicial real: [run #40116271236](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/40116271236) **SUCCESS**: checkout SHA exato, dependências backend/frontend instaladas, imports FastAPI, inicialização HTTP dos dois serviços e `/api/capabilities` por proxy frontend->backend aprovados; geração explicitamente não executada. Repositório inteiro do screenshot-to-code em `$RUNNER_TEMP/screenshot-to-code`, nenhum código de terceiro copiado para frontend do MEG.
- Complemento de validação: o workflow executa também `poetry run playwright install --with-deps chromium`, abre Vite no Chromium headless e envia screenshot da interface para artifact temporário (verificar sucesso no novo run antes de afirmar que a prova existe).
- **Bloqueio real:** sem `GEMINI_API_KEY`/ `OPENAI_API_KEY`/ `ANTHROPIC_API_KEY` configurada e, sobretudo, sem aprovação explícita de cobrança. A imagem oficial só será enviada ao modelo no ambiente protegido após essa autorização. API do MEG não fornece créditos de IA.
- Para testar no Codespace, não publicar serviço externo sem autenticação. Armazenar credencial no mecanismo de secrets do Codespace, nunca em commit, artefato, prints ou logs. A integração só se inicia após geração efetiva, revisão humana e preservação das regras financeiras.
