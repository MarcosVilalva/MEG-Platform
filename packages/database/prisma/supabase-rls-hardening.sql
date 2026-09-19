-- MEG Finanças — hardening do Supabase Data API
--
-- Arquitetura validada em produção:
-- - autenticação/autorização da aplicação acontece na API própria do MEG;
-- - Prisma acessa o PostgreSQL pelo Supavisor usando a role postgres;
-- - postgres possui BYPASSRLS;
-- - anon/authenticated não fazem parte do modelo de autenticação do MEG.
--
-- Portanto, a política correta para o Data API do Supabase é DENY BY DEFAULT:
-- nenhuma tabela financeira/operacional é exposta diretamente para anon/authenticated.
-- O backend MEG continua sendo o único ponto autorizado de leitura e gravação.
--
-- NÃO usar FORCE ROW LEVEL SECURITY enquanto o backend operar com a role postgres.
-- NÃO criar políticas auth.uid(): o MEG não usa Supabase Auth como identidade da aplicação.

BEGIN;

REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE
  public."User",
  public."AppState",
  public."Workspace",
  public."CloudMutationReceipt",
  public."WorkspaceMember",
  public."PlatformAdministrator",
  public."Plan",
  public."WorkspaceSubscription",
  public."WorkspaceNotificationConfig",
  public."WorkspaceInvoice",
  public."NotificationDelivery",
  public."NotificationRecipient",
  public."NotificationEmailRecipient",
  public."AuthSession",
  public."Account",
  public."Category",
  public."PaymentMethod",
  public."FinancialEvent",
  public."LedgerEntry",
  public."Customer",
  public."Receivable",
  public."Receipt",
  public."Budget",
  public."AuditLog",
  public."ImportBatch",
  public."ImportedRow",
  public."CreditCard",
  public."CardPurchase",
  public."CardInstallment",
  public."Payable",
  public."PayablePayment",
  public."RecurringExpense"
FROM anon, authenticated, service_role;

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AppState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CloudMutationReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WorkspaceMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PlatformAdministrator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WorkspaceSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WorkspaceNotificationConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WorkspaceInvoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotificationDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotificationRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotificationEmailRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuthSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FinancialEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Receivable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Receipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ImportBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ImportedRow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CreditCard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CardPurchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CardInstallment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PayablePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RecurringExpense" ENABLE ROW LEVEL SECURITY;

-- Guarda para futuras tabelas, funções e sequências criadas pelo mesmo owner usado pelo Prisma.
-- Como o MEG não usa o Data API do Supabase, nenhuma role de API recebe acesso implícito.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES
FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS
FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE USAGE, SELECT ON SEQUENCES
FROM anon, authenticated, service_role;

-- PostgreSQL concede EXECUTE de funções a PUBLIC por padrão; removemos esse default
-- para evitar uma futura RPC pública por acidente.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS
FROM PUBLIC;

COMMIT;
