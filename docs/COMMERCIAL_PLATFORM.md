# Plataforma comercial do MEG

## Entrega atual

O MEG permanece um produto de finanças pessoais, agora preparado para comercialização multicliente. Cada cliente possui um `Workspace` isolado. Marcos continua sendo um cliente normal no espaço `marcos-financas`, com sua base preservada.

## Papéis administrativos

- **Administrador da plataforma:** controla clientes, planos, licenças, vencimentos e suspensão. Não precisa abrir nem consultar os lançamentos financeiros dos clientes.
- **Administrador do espaço:** gerencia somente os usuários do próprio cliente, dentro do limite do plano.
- **Gerente, Operador e Leitor:** mantêm as permissões financeiras já existentes.

## Planos iniciais

| Plano | Usuários | Recursos base |
| --- | ---: | --- |
| Essencial | 1 | financeiro, alertas e backup |
| Família | 6 (administrador + 5 convidados) | Essencial, equipe e cartões |
| Pro | 10 | Família e relatórios |

Os planos são registros no banco e podem evoluir sem alterar os dados financeiros.

## Licenças

Estados suportados: pendente, teste, ativa, pagamento pendente, suspensa, vencida e cancelada.

- ativa ou teste: leitura e gravação normais;
- demais estados: consulta e backup permanecem disponíveis, mas gravações são bloqueadas;
- ativação, renovação e suspensão são auditadas;
- o responsável recebe aviso por e-mail e WhatsApp usando as integrações oficiais do MEG.

## Cadastro e aprovação

### Novo cliente

1. seleciona **Criar meu espaço financeiro**;
2. informa o nome do espaço e seus dados;
3. recebe um espaço vazio e uma licença pendente;
4. o administrador da plataforma escolhe plano e validade;
5. ao ativar, o responsável vira administrador do próprio espaço.

### Novo membro

1. seleciona **Entrar em um espaço existente**;
2. informa o código do espaço exibido em **Usuários e permissões**;
3. aguarda o administrador daquele cliente aprovar;
4. a solicitação respeita o número máximo de usuários do plano.

## Mensageria

O remetente de WhatsApp e e-mail é a infraestrutura oficial do MEG. Cada cliente cadastra seus próprios destinatários para alertas financeiros. Remetente exclusivo por cliente e cobrança automática não fazem parte deste marco.

## Próximos marcos recomendados

- cobrança recorrente e integração com gateway de pagamento;
- página pública de planos e contratação;
- cupons, inadimplência automática e período de carência configurável;
- métricas comerciais sem exposição de dados financeiros;
- remetente de WhatsApp dedicado como adicional opcional.