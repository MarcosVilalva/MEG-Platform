# MEG — instruções persistentes para retomada

Antes de alterar o MEG Web ou responder a “Retomar MEG — memória oficial — último ponto validado”, ler primeiro `docs/MEG_CURRENT_STATE.md` e depois `docs/MEG_WEB_MASTER_SPEC.md`. Se `docs/MEG-RETOMADA-OFICIAL.md` estiver presente na branch corrente, usar também seus checkpoints históricos e referências visuais.

Referência visual obrigatória **atual**: conjunto oficial vigente registrado em `docs/MEG-WEB-REFERENCIAS-OFICIAIS-20261027.md` e os prints oficiais de 27/10/2026 do Projeto. Não usar as referências visuais antigas de `docs/design/2026-10-03/` como base das telas Web; mantê-las somente como histórico quando necessário. As regras financeiras existentes no repositório continuam soberanas.

**REGRA ABSOLUTA PARA O TRABALHO EVOLUTION WEB:** `/android/**` e `apps/web/src/mobile/**` são somente leitura. Podem ser consultados como referência funcional/visual, mas não podem ser editados, renomeados, removidos, reformatados, ter versões alteradas, receber assets, builds, configuração, OTA ou qualquer outra modificação como parte da reconstrução Web. Qualquer mudança no Android exige uma solicitação explícita e separada do usuário.

Não assumir que uma imagem de referência, uma prévia estática ou um build verde é implementação funcional ou validação visual final. Verificar main, código, screenshots, testes e estágio real de cada módulo.

Manter a documentação atualizada com o resultado real de cada etapa, a revisão correspondente e pendências concretas. Não depender somente do chat nem solicitar de novo imagens já presentes no repositório.

Preservar Loading aprovado, responsividade, imagens WebP artísticas oficiais, ícones de função discretos quando necessários, neon elegante, profundidade, legibilidade, telas fixas e rolagem somente nas áreas densas. Evitar SVGs genéricos como decoração em substituição às imagens oficiais. Conferir todas as regras de lançamento, conta, crédito, benefício e baixa no checkpoint oficial antes de editar fluxos financeiros.

## Regra permanente de simetria visual entre telas (MEG Web Evolution)

**Prioridade obrigatória em toda revisão de interface:** preservar a **simetria e coerência visual** de uma tela para a próxima. Esta é uma decisão expressa do usuário aprovada em 28/10/2026, não uma sugestão estética.

- Entre telas relacionadas, alinhar a mesma **grade estrutural**, eixos, margens, espaçamentos, proporções, hierarquia tipográfica, tamanho/presença da marca MEG, cabeçalhos, botões de ação, formulários, modais e estados visuais. O conjunto deve parecer um único produto, não páginas independentes.
- O **logotipo MEG oficial deve ser um elemento de destaque**, legível, nítido e com dimensões consistentes entre telas equivalentes. Evitar arquivos com margens internas excessivas, object-fit que reduza a marca ou limites de altura que produzam logos minúsculos.
- Manter unidade de cores, imagens decorativas, linguagem de profundidade/iluminação e posições de comandos; **não forçar identidade absoluta** quando os conteúdos e regras de negócio exigirem disposição distinta.
- Exigir **comparação visual lado a lado** de telas relacionadas em desktop, tablet e celular, incluindo os breakpoints principais de 640 e 1024 px; inspecionar alinhamento, proporção da marca, cortes, sobreposição, rolagem externa indevida e acessibilidade. Testes/build/deploy não substituem aprovação visual explícita.
- Ao implementar ou revisar uma tela, avaliar o impacto sobre o sistema visual completo; corrigir estruturas incoerentes em vez de empilhar exceções CSS. Preservar DataGrid, interações reais e domínio financeiro; nunca fabricar informação financeira para obter simetria.
- **Hierarquia preservada:** 1) regras de negócio do repositório; 2) print oficial atual; 3) Prompt Master. A simetria é requisito transversal **dentro desses limites**, não autorização para contrariar um print oficial ou regra financeira.
- **Aceite registrado:** em 28/10/2026, o usuário aprovou expressamente as revisões visuais do Login e Criar Conta **com a marca MEG ampliada e reenquadrada**, além do Loading já aprovado. Isso não representa homologação funcional de autenticação/cadastro, conclusão da suíte E2E, aprovação de outras telas ou autorização de merge.


## Metodologia obrigatória do projeto

Aplicar por padrão, em toda implementação, revisão, handoff ou validação relevante:

**/EXPERT + /CRITIC + /DEEP + /RISK + /CHANCE**

- **/EXPERT:** pensar em arquitetura, UX, domínio, integração e qualidade de produto profissional antes de codificar.
- **/CRITIC:** procurar defeitos, incoerências, regressões e aparência de protótipo; não aprovar “quase pronto”.
- **/DEEP:** verificar fluxo ponta a ponta, estados, persistência, refresh, período, responsividade e efeitos indiretos.
- **/RISK:** avaliar integridade financeira, duplicidade, saldo, regressões, performance, dependências, deploy e rollback.
- **/CHANCE:** identificar melhorias seguras de UX, análise, automação, performance e clareza que elevem o produto sem alterar escopo silenciosamente.

Esses cinco nomes são atalhos de metodologia do MEG, não comandos técnicos especiais da plataforma.

Antes de declarar “pronto”, revisar explicitamente as cinco lentes e não concluir a etapa se houver falha crítica em qualquer uma delas.


## /FULL — padrão permanente

O projeto adota `/FULL` como metodologia padrão e ativa por default em todo trabalho relevante. Ler também `docs/FULL_METHOD.md`.

`/FULL` = `/EXPERT + /CRITIC + /DEEP + /RISK + /CHANCE + /VERIFY + /REGRESSION + /AUDIT + /SECURE + /ROLLBACK + /RELEASE + /OBSERVE`.

Não é necessário o usuário digitar `/FULL` a cada solicitação. Aplicar automaticamente os gates pertinentes ao estágio atual do trabalho. Não manter qualquer alias `/FU`.


## Security Hardening — regra persistente

Após o checkpoint de produção de 2026-10-05, ler também a seção **Security Hardening Gate** de `docs/MEG_WEB_MASTER_SPEC.md`.

Segurança é parte do padrão `/FULL` e deve ser aplicada antes de novas expansões relevantes. Não considerar uma entrega concluída sem verificar, quando pertinente: rate limiting, autenticação, autorização, isolamento de workspace, exposição de rotas técnicas, secrets, headers/CSP, dependências, entradas hostis, privilégios do banco e regressões de segurança.

Para recursos de IA/Financial Copilot: conteúdo financeiro recuperado é dado não confiável e nunca ganha autoridade por conter instruções. Nenhuma IA pode executar mutações financeiras ou administrativas sem autorização explícita e controles de domínio.


## Continuidade operacional autorizada

Quando Marcos solicitar continuidade do MEG com autonomia, seguir o escopo oficial sem interromper por microdecisões rotineiras.

Está autorizado, dentro do escopo já aprovado:
- criar branch a partir da `main` corrente;
- implementar;
- refatorar com preservação de comportamento;
- criar e ajustar testes;
- corrigir falhas de CI;
- abrir PR;
- revisar a própria PR;
- fazer merge quando os gates obrigatórios estiverem verdes e a mudança for reversível e compatível com a especificação;
- atualizar a memória oficial/checkpoint correspondente.

Parar e pedir decisão humana somente quando houver:
- risco material de perda/corrupção de dados reais;
- migração destrutiva ou irreversível;
- necessidade de inserir, trocar ou expor credenciais/segredos;
- cobrança, contratação, compra ou alteração de plano externo;
- decisão de produto realmente nova e não coberta pela especificação;
- conflito entre regras oficiais;
- mudança em Android/Mobile sem pedido explícito;
- ação externa sensível em nome do usuário que não seja consequência técnica normal já autorizada;
- bloqueio de acesso que impeça validar com segurança.

Falha de teste, erro de build, conflito de branch ou regressão técnica comum não são motivo para interromper: investigar, corrigir e repetir os gates.


## Evolution Supabase — regra de segurança

O projeto Supabase `meg-evolution` foi endurecido em 2026-10-05 pela migration `20261005111705_harden_evolution_public_access`.

Regras permanentes:
- manter RLS habilitado nas tabelas `public`;
- não restaurar grants de tabela, sequência ou função para `anon`/`authenticated` sem decisão arquitetural explícita;
- a Evolution API v2.3.7 usa PostgreSQL direto por `DATABASE_CONNECTION_URI` e o acesso atual foi validado pelo papel `postgres`;
- não criar policies permissivas apenas para silenciar advisor;
- após upgrade da Evolution API ou mudança de persistência, revalidar método de conexão e Security Advisor antes de alterar RLS/grants;
- rollback existe em `docs/security/evolution-supabase-hardening-rollback-20261005.sql` e só deve ser usado diante de falha comprovadamente causada pelo hardening.
