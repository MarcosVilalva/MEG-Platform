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

## Menu Lateral MEG — consolidado após revisão visual
O painel lateral passa a ser referido no projeto como **Menu Lateral MEG**.

Regras consolidadas após a validação por screenshots:
- todos os módulos ficam acessíveis no mesmo fluxo; não existe mais bloco `<details>` escondendo `Web completo`;
- seções visuais: **Principal / Gestão / Inteligência / Sistema**;
- o miolo de módulos possui rolagem vertical própria com scrollbar fina e visível, inclusive no modo retraído;
- busca expandida usa ícone vetorial + `Buscar no MEG` + atalho `⌘K`;
- busca retraída vira botão **circular de 43×43 px**, com ícone centralizado, sem o contorno quadrado antigo;
- ícones foram redesenhados em uma única família SVG de linha, com `fill:none` e `stroke:currentColor` protegidos para impedir os artefatos quadrados vistos no navegador;
- Histórico e Pendentes usam conceitos semanticamente diferentes: histórico = relógio/retorno; pendentes = calendário/alerta;
- badge de Pendentes fica preso ao canto do botão sem comprimir o ícone;
- o perfil duplicado foi removido do rodapé do Menu Lateral; perfil fica somente na barra superior;
- o rodapé lateral contém apenas `Sair`, separado da navegação por divisor;
- o chevron `v/⌄` da barra superior foi ocultado enquanto não existir um menu de perfil funcional associado;
- em telas desktop de pouca altura, espaçamentos são compactados sem esconder módulos.

## Perfil, foto e avatares
O `AuthUser` atual da API **não possui campo de avatar/foto**. Para não inventar persistência em nuvem, a etapa atual implementa uma preferência visual local por usuário/navegador:
- chave local: `meg.profile.avatar.<userId>`;
- três modos: iniciais, avatar MEG pré-selecionado ou foto enviada pelo usuário;
- seis avatares pré-selecionados: Aurora, Oceano, Violeta, Grafite, Cobre e Esmeralda;
- upload aceita PNG/JPEG/WebP, limita arquivo a 8 MB, centraliza/corta a imagem e normaliza para 320×320 antes de guardar a preferência;
- a preferência escolhida aparece no avatar da topbar;
- o usuário logado também vê o mesmo avatar no próprio card em Usuários e permissões;
- demais usuários continuam usando iniciais até existir campo oficial de avatar no backend;
- não afirmar que foto/avatar está sincronizado na nuvem até existir contrato/backend específico.

## Usuários e permissões
- Leitura administrativa oficial agrupada em **Aguardando aprovação / Usuários ativos / Bloqueados e inativos**.
- Cards mostram perfil, telefone, data do cadastro, último acesso e estado da conta.
- Solicitações pendentes recebem destaque visual.
- O card do usuário autenticado reflete a preferência visual local de foto/avatar escolhida em `Configurações → Meu perfil`.
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

## Configurações V15 — reorganizada no padrão de produto
A tela deixou de ser uma grade técnica única e passou a funcionar como workspace V15 com quatro áreas:
1. **Meu perfil** — identidade, foto/avatar e dados oficiais do cadastro;
2. **Aparência e Home** — tema e composição funcional do dashboard;
3. **Segurança** — sessão, permissões e recursos de proteção realmente disponíveis/consultados;
4. **Sistema** — saúde da base, sincronização, backup, dispositivos, alertas, diagnóstico e informações do MEG.

Regras de honestidade operacional:
- recursos nativos não lidos aparecem explicitamente como **não consultados** ou integração pendente;
- nenhuma versão Android, dispositivo, destinatário ou automação é inventado;
- restauração de backup permanece bloqueada durante read-only;
- foto/avatar fica explicitamente marcada como preferência visual local enquanto o backend não expuser campo oficial.

### Personalização funcional da Home
- usuário pode mostrar/ocultar `Saldo monetário`, `Diagnóstico e projeção`, `Resumo financeiro`, `Benefício alimentação`, `Histórico recente` e `Agenda financeira`;
- aplicação é imediata;
- preferência persiste localmente no navegador em `meg.dashboard.preferences`;
- `Restaurar padrão` reativa todos os blocos;
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

## Estado técnico atual
- Head funcional/testado antes deste checkpoint documental: `b342531cd89eb85ddea3c72c3b1b259484b7da0a` (`test: atualizar contrato visual do menu e perfil V15`).
- Lote atual: refinamento completo do Menu Lateral + Configurações V15 por seções + perfil/foto/avatares locais + integração visual na topbar e card do usuário autenticado.
- CI **1331** verde nesse head.
- Deploy Render `dep-daj99o5ckfvc739jqb40` **live** nesse head.
- PR #243 permanece draft, aberta e sem merge.

## Próximos gates
1. validar visualmente Menu Lateral aberto/retraído, scrollbar, busca circular, badges, ícones e Sair em desktop/tela dividida;
2. validar Configurações → Meu perfil: iniciais, seis avatares e upload de foto; conferir reflexo imediato na topbar e no próprio card em Usuários;
3. validar Configurações em claro/escuro e tamanhos estreitos;
4. auditar PaymentMethods ativos e aplicar regra de Receita = Pix/Dinheiro/Depósito bancário;
5. avaliar contrato backend de avatar/foto somente quando formos liberar persistência real em nuvem;
6. avaliar fluxo seguro por token para recuperação antes do corte;
7. decidir explicitamente sobre PR #247 para performance mensal;
8. fechar últimas paridades/dependências sem `npm audit fix --force`;
9. somente depois iniciar escrita financeira seletiva;
10. corte da Web atual apenas após paridade funcional, numérica e visual suficiente.

## Protocolo de retomada
Ao aproximar o limite de contexto: parar em commit seguro, garantir CI/deploy, atualizar este arquivo e a PR #243.

Prompt para novo chat:

`Continuar MEG Phoenix V15 pela PR #243 e docs/PHOENIX_V15_CHECKPOINT.md; não fazer merge nem liberar escrita financeira sem validação.`
