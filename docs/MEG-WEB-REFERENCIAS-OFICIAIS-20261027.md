# MEG Web Evolution · Referências oficiais de 27/10/2026

## Decisão operacional desta rodada

O usuário autorizou uma **reconstrução sequencial**, com somente uma tela por vez. Este registro relaciona as 16 imagens oficiais recebidas neste chat. Imagens anteriores não determinam a composição das telas correspondentes.

**Primeira revisão visual:** `Loading pos login.png`. O nome fornecido indica *pós-login*; mantemos o comportamento do código sem inventar splash obrigatório antes da autenticação. A ordem de verificação visual pode começar pelo carregamento, mas a ordem funcional permanece `Login → carregamento dos dados → aplicação`.

**Padrão visual:** base dark teal, brilhos turquesa, painéis em vidro, identidade MEG e **imagens artísticas WebP reais**. Nunca utilizar screenshot inteiro como camada clicável; campos, botões, tabela, feedback e estado são código real. Ícones pequenos de comandos continuam possíveis quando necessários à acessibilidade.

## Registro das referências

| Tela / finalidade | Imagem do projeto |
|---|---|
| Carregamento após login | `Loading pos login.png` |
| Login | `Login.png` |
| Home | `Tela principal.png` |
| Lançamentos, preservando DataGrid | `Lancçamentos - utilizar data grid.png` |
| Seletor de Novo Lançamento | `Novo lançamento financeiro neon(2).png` |
| Despesa | `Lançamento Despesa.png` |
| Editar Lançamento | `Editar Lançamento.png` |
| Pendentes / Contas a pagar | `Contas a pagar.png` |
| Confirmar Pagamento | `Confirmar Pagamento.png` |
| Cartões | `Meus Cartões.png` |
| Central do cartão | `Central de Cartões.png` |
| Pagar Fatura | `Pagar fatura.png` |
| Benefícios | `Central de Beneficios.png` |
| Registrar Recarga | `Registrar recarca beneficio.png` |
| Nova Transferência | `Nova Transferência.png` |
| Selecionar Período | `Fitro de data.png` |

Nomes preservados como fornecidos; não são afirmações de que os mockups ilustrativos documentam regras financeiras ou dados reais. O Prompt Master e `docs/MEG-WEB-FINANCIAL-AUTHORITY.md` continuam obrigatórios.

## Contratos que não podem ser modificados

- O `DataGrid` existente em `apps/web/src/meg-web-evolution/datagrid/` permanece a única base da tabela reutilizável; adaptações de cores, colunas e responsividade só na etapa correspondente, sem regressão das funções já construídas.
- Nenhuma UI calcula saldo, parcela, fatura, liquidação, benefício, saldo futuro ou status. Usar autoridades financeiras canônicas da API.
- Não alterar `apps/android`, fluxo Android/Capacitor, produção ou escritores financeiros para satisfazer prints.
- Na revisão de telas de autenticação, os dados de acesso nunca são inseridos em imagens, código de preview ou base pública.
- A imagem de referência pode conter valores e comportamentos meramente ilustrativos. Esses elementos não autorizam valores fixos, saldos fictícios passados como reais nem recursos financeiros não implementados.
- Usar apenas os breakpoints principais 640 e 1024 para estrutura; nenhum campo cortado ou atrás de footer; não pedir ao usuário para reduzir zoom como solução.

## Dados existentes do banco: situação e segurança

**Ainda não importados.** O Render atual é apenas uma prévia de arquivos estáticos sem PostgreSQL exclusivo. Não há acesso comprovado ao banco com dados existentes dentro desta sessão, nem snapshot seguro identificado. Antes de importar:
1. localizar o banco de origem e o responsável pela autorização;
2. confirmar que há destino isolado, vazio/descartável e backups;
3. migrar estrutura compatível com Prisma, sem conexão de escrita à produção;
4. utilizar snapshot de leitura autorizado com mascaramento de dados pessoais/sigilosos e substituição de credenciais/tokens;
5. confirmar contagens, relações, saldos e regras pelas funções canônicas, com testes de caracterização;
6. bloquear qualquer envio de credenciais ou dados pessoais ao preview público.
Não inventar ou duplicar saldos nas telas para suprir a falta de base.

## PR da Tela 01

- Branch: `meg-web-evolution/07-revisao-visual-loading-20261027`; PR #649 Draft contra `main`.
- Artistas decorativos: `apps/web/public/meg-web-evolution/visual-loading/{ambient,hologram,logo}.webp`, recortes e tratamentos da imagem oficial, separando ilustração de elementos React reais.
- `LoadingScreen.tsx` preserva API de props, estados vazio/erro e leitura `progress` do runtime. A prévia estática anima o brilho visual **sem afirmar carregamento real**; runtime mantém progresso verdadeiro com atributo ARIA. Nenhuma mutação financeira.
- `loading.css` reconstruído estruturalmente sem CSS antigo sobreposto. `apps/web/visual-sequence/` é preview visual isolado sem login e sem API.
- Gates necessários: teste estático de contrato, build do Render, screenshot desktop/mobile, confirmação visual explícita do usuário. **Deploy não aprova a tela**.
- A próxima tela só será abordada após aprovação visual; o Login fica para a rodada seguinte.

## Decisão de continuidade

Nenhuma imagem deste conjunto é autorizada como screenshot de interface completa em produção. Somente ilustrações decorativas, recortadas quando necessário; todas as ações continuam sendo HTML/React reais.
