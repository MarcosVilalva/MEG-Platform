# Phoenix V15 — Checkpoint de Continuidade

Fonte persistente para retomar o MEG Phoenix V15. Em um novo chat, consultar primeiro este arquivo e a PR #243.

## Segurança e branches
- Branch de homologação: `phoenix/v15-clean-room`.
- PR principal: #243 — deve permanecer **draft, aberta e sem merge** até autorização explícita.
- **NÃO mesclar a PR #243 em `main` sem autorização explícita do usuário.**
- Web/GitHub Pages de produção permanecem intactos durante a homologação.
- Phoenix continua **read-only para finanças**; escrita financeira só será liberada fluxo por fluxo após paridade, idempotência, auditoria e proteção transacional.
- Exceções de POST do preview são somente do ciclo de autenticação: login, refresh, logout, cadastro e recuperação de acesso.
- Links de validação devem sempre usar cache-buster `?v=<sha>`.

## Infraestrutura
- Preview: `https://meg-phoenix-v15-preview.onrender.com`.
- Serviço Render: `meg-phoenix-v15-preview` (`srv-daimvbgae00c73f68bfg`).
- Auto deploy ativo; não disparar deploy manual após commits na branch Phoenix.
- API do preview: `https://meg-platform-api.onrender.com`, via proxy.
- API principal Render continua em `main`; alterações backend exclusivas da branch Phoenix não estão ativas até PR/hotfix separado ser explicitamente mesclado.
- Cold start do Render Free pode mostrar a tela do próprio Render; isso não é UI do MEG.

## Direção do produto
- V15 validada é a referência visual/UX oficial.
- Phoenix é reconstrução clean-room React ligada aos dados reais, sem reaproveitar o layout legado.
- Web deve ser consolidada primeiro; Android fica para a etapa seguinte, focado no uso móvel essencial.
- Nenhum mock pode substituir dado real ausente.
- Objetivo da Fase 4: fechar leitura, projeção, consistência visual, autenticação, performance e paridade antes da escrita seletiva.

## Entrada, cadastro e recuperação
A entrada Phoenix já foi transformada em experiência de produto:
- layout premium responsivo;
- proposta reduzida para evitar repetição;
- login com mostrar/ocultar senha, estados de erro/carregamento e linguagem humana;
- `Criar conta` e `Esqueci minha senha` integrados ao mesmo painel.

Cadastro real:
- `REQUEST_ACCESS`: solicita acesso a um espaço existente e pode ficar `PENDING_APPROVAL`;
- `CREATE_WORKSPACE`: solicita criação de novo espaço MEG;
- nome, telefone, e-mail, senha, confirmação e força de senha.

Recuperação atual:
- usa `/auth/forgot-password`;
- backend ainda gera senha temporária, substitui a anterior, revoga sessões e envia a senha por canais configurados;
- **não testar “Enviar recuperação” na conta principal apenas para conferir UI**;
- antes do corte final, avaliar migração para token/código de uso único + nova senha escolhida pelo usuário.

## Usuários e permissões
- Leitura administrativa oficial agrupada em **Aguardando aprovação / Usuários ativos / Bloqueados e inativos**.
- Cards mostram perfil, telefone, data do cadastro, último acesso e estado da conta.
- Solicitações pendentes recebem destaque visual.
- Ações administrativas continuam bloqueadas durante a homologação; nenhuma aprovação/bloqueio é simulada.

## Seletor global de período
Padrão V15 restaurado:
- **Mês / Intervalo / Tudo**;
- Hoje / 7 dias / 30 dias / Mês atual / Mês anterior;
- data inicial/final e Aplicar período;
- carregamento sem desmontar a fotografia atual.

Regras:
- Mês troca snapshot somente quando a nova leitura estiver completa/coerente.
- Intervalo abre Lançamentos com filtro real por data.
- Tudo permanece ativo entre Home e Lançamentos e usa o histórico normalizado completo.
- `purchaseDate` real é diferente de vencimento e tem prioridade na coluna Data da compra.
- Rótulos de mês usam UTC controlado para evitar regressão por timezone.

## Home — passado, presente, futuro e Tudo
### Mês futuro = horizonte financeiro
Selecionar um mês futuro significa **até o fim daquele mês**, e não apenas o movimento isolado do mês:
- saldo monetário atual continua sendo o dinheiro realizado hoje;
- compromissos pendentes acumulados até o corte;
- receitas futuras planejadas até o corte;
- dinheiro livre após compromissos;
- projeção final;
- primeira data de saldo negativo e menor saldo previsto, quando aplicável;
- benefício/Verocard separado do caixa;
- transferências neutras.

Referência de auditoria até dezembro/2026, sem hardcode:
- saldo realizado: `R$ 10.178,88`;
- compromissos líquidos: `R$ 25.297,21`;
- receitas futuras planejadas encontradas: `R$ 0,00`;
- 277 obrigações acionáveis;
- 7 vencidas / `R$ 2.625,05`;
- primeira projeção negativa: `05/10/2026`;
- fechamento/mínimo do horizonte: `-R$ 15.118,33` em `28/12/2026`.

### Tudo
- Home própria desde o primeiro lançamento normalizado;
- saldo monetário atual permanece a fotografia realizada de hoje;
- consolida receitas/despesas registradas e realizadas;
- mostra compromissos em aberto, receitas futuras, saldo livre e projeção final;
- benefício separado.

Base observada: aproximadamente 3.633 eventos normalizados, de 2025-06 a 2028-08.

## Análises Financeiras — consolidada no nível V15
Lote funcional consolidado em setembro/2026:
- KPIs de receitas, despesas, resultado projetado, resultado realizado, média diária e concentração Top 3;
- classificações continuam derivadas dos dados reais com compatibilidade legada `expenseClass -> category.group/name`;
- comparação período atual x anterior;
- evolução mensal;
- composição por forma de pagamento;
- bloco `Leitura MEG` com maior classificação, variação de despesas e fechamento projetado;
- referências V15 **50% Essenciais / 30% Flexíveis / 20% Poupança** são apresentadas explicitamente como referências, sem classificar automaticamente grupos que ainda não foram validados;
- **Índice MEG 0–100 permanece “Em calibração”**: não exibir nota inventada antes de critérios/pesos transparentes e validados;
- Análises aprofunda tendência; não deve esconder o diagnóstico de déficit/compromissos da Home.

## Configurações V15 — consolidada
A tela agora reúne os blocos previstos na V15 e melhorias acordadas:
- Saúde do sistema;
- Preferências gerais;
- Segurança e sessão;
- Sincronização/integridade;
- Backup e dados;
- Dispositivos;
- Atualização Android;
- Alertas e destinatários;
- Automação de alertas;
- Diagnóstico;
- Sobre MEG.

Regras de honestidade operacional:
- recursos nativos não lidos aparecem explicitamente como **não consultados** ou integração pendente;
- nenhuma versão Android, dispositivo, destinatário ou automação é inventado;
- horários V15 `06:00 / 12:00 / 19:00`, fuso São Paulo e resumo ampliado a cada 5 dias `06:00` aparecem apenas como referência de produto até existir contrato operacional correspondente;
- restauração de backup permanece bloqueada durante read-only.

### Personalização funcional da Home
Melhoria acordada além da estrutura básica da V15:
- usuário pode mostrar/ocultar `Saldo monetário`, `Diagnóstico e projeção`, `Resumo financeiro`, `Benefício alimentação`, `Histórico recente` e `Agenda financeira`;
- aplicação é imediata;
- preferência persiste localmente no navegador em `meg.dashboard.preferences`;
- `Restaurar padrão` reativa todos os blocos;
- preferências são reaplicadas antes da montagem do app para evitar piscar a Home padrão;
- nesta fase a preferência é local/browser, não uma configuração de workspace gravada no backend.

## Performance
- contexto estático é reutilizado entre trocas mensais;
- troca mensal é atômica e protege contra resposta atrasada;
- modo Tudo usa agregador `/finance/phoenix-preview/events` com paginação servidor-a-servidor, deduplicação e cache curto de 60 s por sessão.

### PR #247 — otimização mensal backend
PR separada `#247 — Hotfix: consolidar snapshot financeiro Phoenix`:
- base `main`;
- somente leitura;
- consolida resumo/fluxo/análises/benefício sobre leitura compartilhada;
- CI 1293 verde;
- permanece draft e sem merge aguardando autorização explícita.

Não afirmar que essa otimização está ativa na API principal antes de merge/deploy.

## Grid MEG
Padrão obrigatório para tabelas reais: ordenação, filtro por coluna, busca em valores, seleção múltipla, selecionar tudo, filtros de texto/data/número, Aplicar/Cancelar/Limpar, chips ativos, claro/escuro e mobile.

Telas com Grid MEG: Lançamentos, Cadastros, Cartões, Contas a receber, Receitas e Fluxo de caixa. Histórico, Pendentes e Usuários mantêm layouts próprios.

## Classificação e Grupo
- `Category.group` = **Classificação**.
- `Category.name` = **Grupo**.
- Despesa: Classificação primeiro, Grupo vinculado depois; `categoryId` é autoridade.
- Receita: Classificação opcional, sem exigir Grupo.
- Fallback legado: `sourceDetails.expenseClass/group`, depois `category.group/name`.
- Mesma semântica em Lançamentos, Pendentes e Análises.

Pendente antes da escrita: em Receita, restringir formas aos cadastros reais equivalentes a **Pix, Dinheiro e Depósito bancário**, após conferência dos PaymentMethods ativos.

## Política monetária e referência setembro/2026
- `signedAmount` é autoridade.
- Estornos/reversões reduzem despesa; nunca somar tudo por `abs(amount)`.
- Benefício/Verocard fica fora do caixa monetário.
- Transferência é neutra.

Referência, sem hardcode:
- saldo anterior `R$ 2.643,56`;
- receitas monetárias `R$ 10.581,99`;
- despesas monetárias líquidas `R$ 12.454,42`;
- despesas realizadas `R$ 3.046,67`;
- pendentes líquidos `R$ 9.407,75`;
- saldo realizado `R$ 10.178,88`;
- fechamento projetado `R$ 771,13`;
- benefício: créditos `R$ 2.000,00`, utilizado `R$ 1.250,83`, saldo `R$ 749,17`.

Agenda setembro: 109 obrigações acionáveis / `R$ 9.505,66`; ajustes negativos `-R$ 97,91`; pendente líquido `R$ 9.407,75`.

## Cartões — referência setembro/2026
- AZUL: fatura `R$ 1.875,52`, compras `R$ 1.937,52`, créditos `R$ 62,00`, comprometido `R$ 7.166,25`.
- LATAM PASS: fatura `R$ 3.422,24`, compras `R$ 3.453,24`, créditos `R$ 31,00`, comprometido `R$ 8.358,55`.
- MELI: fatura paga `R$ 1.824,02`, compras `R$ 1.943,08`, créditos `R$ 119,06`, comprometido `R$ 2.608,42`.
- RIACHUELO: fatura `R$ 132,99`, comprometido `R$ 531,96`.

## Pendência visual conhecida — navegação
A validação do código no head atual mostrou que `Histórico` e `Pendentes` ainda usam o mesmo glifo `◷` em `PhoenixApp.tsx`, apesar de uma etapa anterior ter sido considerada concluída. Também é necessário garantir tooltip explícito no rail recolhido. Tratar isso como correção visual aberta; não afirmar que está resolvido antes de novo commit/CI/deploy.

## Estado técnico atual
- Head funcional: `6ae08aad4ee236b02a64da4a723748f3f64f10b2` (`fix: preservar contrato nominal das análises V15`).
- Lote atual: Análises Financeiras V15 + Configurações V15 + personalização funcional da Home.
- CI **1317** verde.
- Deploy Render `dep-daj8ga5ckfvc739j7a10` **live** para esse head.
- PR #243 deve continuar draft, aberta e sem merge.

## Próximos gates
1. validar visualmente Análises e Configurações em desktop, tela dividida, mobile, claro e escuro;
2. validar em Configurações que mostrar/ocultar blocos altera a Home e persiste após recarregar;
3. corrigir definitivamente ícones/tooltip do rail recolhido, pois o código atual ainda repete `◷` em Histórico/Pendentes;
4. auditar PaymentMethods ativos e aplicar regra de Receita = Pix/Dinheiro/Depósito bancário;
5. avaliar fluxo seguro por token para recuperação antes do corte;
6. decidir explicitamente sobre PR #247 para performance mensal;
7. fechar últimas paridades/dependências sem `npm audit fix --force`;
8. somente depois iniciar escrita financeira seletiva;
9. corte da Web atual apenas após paridade funcional, numérica e visual suficiente.

## Protocolo de retomada
Ao aproximar o limite de contexto: parar em commit seguro, garantir CI/deploy, atualizar este arquivo e a PR #243.

Prompt para novo chat:

`Continuar MEG Phoenix V15 pela PR #243 e docs/PHOENIX_V15_CHECKPOINT.md; não fazer merge nem liberar escrita financeira sem validação.`
