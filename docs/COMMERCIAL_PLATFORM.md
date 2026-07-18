# Plataforma comercial do MEG

## Visão atual

O MEG continua sendo um produto de finanças pessoais, agora estruturado como uma plataforma comercial multicliente. Cada cliente possui um `Workspace` isolado. O espaço pessoal de Marcos permanece como o primeiro cliente, sem mistura de dados com os próximos assinantes.

## Como as atualizações funcionam

Existe uma única versão do código da aplicação. Quando uma atualização é publicada, todas as organizações passam a usar a nova versão automaticamente no próximo acesso ou recarregamento. Os dados não são copiados entre clientes e não são substituídos pelo deploy.

As mudanças de banco são aplicadas uma vez ao esquema compartilhado. Toda tabela financeira usa o identificador do `Workspace`, mantendo a separação lógica dos dados. A administração comercial não precisa abrir lançamentos financeiros dos clientes.

## Papéis administrativos

- **Administrador da plataforma:** controla clientes, planos, licenças, mensalidades, vencimentos, suspensão e reativação.
- **Administrador do espaço:** gerencia somente os usuários e integrações do próprio cliente, dentro do limite do plano.
- **Gerente, Operador e Leitor:** seguem as permissões financeiras existentes.

## Planos iniciais

| Plano | Usuários | Mensalidade inicial | Recursos base |
| --- | ---: | ---: | --- |
| Essencial | 1 | R$ 19,90 | financeiro, alertas e backup |
| Família | 6 | R$ 29,90 | Essencial, equipe e cartões |
| Pro | 10 | R$ 49,90 | Família e relatórios |

Os preços são registros administráveis no banco; a alteração de plano não move nem apaga dados financeiros.

## Cadastro e aprovação

### Novo cliente

1. Seleciona **Criar meu espaço financeiro** e escolhe o plano pretendido.
2. Informa o nome do espaço e seus dados.
3. O sistema cria um espaço vazio e uma licença pendente.
4. O administrador da plataforma analisa, escolhe o plano definitivo e ativa ou libera o teste.
5. Ao ativar, o responsável passa a ser administrador do próprio espaço.

### Novo membro

1. Seleciona **Entrar em um espaço existente**.
2. Informa o código do espaço exibido em **Usuários e permissões**.
3. Aguarda o administrador daquele cliente aprovar.
4. A aprovação respeita o limite de usuários do plano.

## Licença, mensalidade e bloqueio

Estados suportados: pendente, teste, ativa, pagamento pendente, suspensa, vencida e cancelada.

- a cobrança automática só é habilitada quando a primeira mensalidade é gerada no painel comercial;
- depois disso, uma mensalidade é criada a cada competência, usando o plano e o dia de vencimento do cliente;
- após o vencimento, a licença entra em **pagamento pendente** durante a carência configurada, inicialmente de cinco dias;
- terminado o prazo de carência sem baixa, a licença é suspensa automaticamente;
- ao marcar a mensalidade como paga, o espaço é reativado e recebe mais 30 dias de validade;
- durante bloqueio, consulta e backup permanecem disponíveis, mas novas gravações financeiras são impedidas;
- ativações, alterações de plano e baixas de mensalidade ficam na auditoria.

A base pessoal de Marcos não recebe cobrança automática: assinaturas antigas começam com `billingEnabled=false`.

## WhatsApp gerenciado pelo MEG

O envio é centralizado no número oficial do MEG. O cliente não precisa contratar Evolution API, criar instância nem informar chave técnica.

Em **Ajustes e dados > Alertas de vencimento**, o administrador do espaço apenas cadastra e seleciona os números que receberão os avisos. Os destinatários continuam isolados por cliente e o conteúdo financeiro nunca é compartilhado entre espaços.

As credenciais centrais permanecem exclusivamente no ambiente seguro da API (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE`). A tela do cliente não exibe nem aceita essas credenciais. O botão de teste envia pelo canal oficial do MEG ao telefone do administrador do espaço.
## E-mail por cliente

O provedor de entrega continua centralizado no MEG (Resend ou Brevo). Cada cliente pode ativar ou desativar o canal, cadastrar destinatários, definir o nome visível do remetente e o endereço de resposta. Isso evita obrigar cada cliente a contratar um provedor de e-mail e mantém a reputação do domínio sob controle.

## Próximos incrementos opcionais

- gateway de pagamento para baixa automática por Pix/cartão;
- página pública de contratação e cupons;
- métricas comerciais de uso sem exposição de dados financeiros;
- observabilidade de entregas e franquias de mensagens por plano;
