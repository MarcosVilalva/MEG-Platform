# Segurança

## Identidade e acesso

Perfis padrão:

| Perfil | Capacidades |
|---|---|
| ADMIN | Controle total, usuários, permissões e exclusões críticas |
| MANAGER | Gestão financeira completa, sem administração global |
| OPERATOR | Consulta, criação e alteração operacional |
| VIEWER | Somente leitura |

## Cadastro

- nome, e-mail, senha e confirmação de senha;
- senhas devem coincidir;
- senha mínima de 8 caracteres;
- novos usuários ficam com status PENDING;
- somente usuário aprovado e ativo pode autenticar;
- administrador principal: `m_vilalva@hotmail.com`.

## Aprovação

O administrador pode aprovar, rejeitar, bloquear e reativar. Aprovação define o perfil. Bloqueio revoga sessões ativas.

## Sessões

- access token curto;
- refresh token rotativo e revogável;
- logout revoga a sessão;
- sessões persistidas e auditáveis.

## Segredos

- chaves de JWT, SMTP, WhatsApp e provedores ficam em variáveis de ambiente;
- nunca expor chave privada no React;
- nunca versionar `.env`;
- a chave pública do Supabase, quando utilizada, não substitui RLS.

## Próximos controles obrigatórios

- recuperação de senha;
- confirmação de e-mail;
- limitação de tentativas;
- bloqueio temporário;
- MFA opcional;
- permissões granulares por módulo;
- auditoria de alterações sensíveis;
- criptografia e política de backup;
- revisão LGPD antes da Beta.

## Comunicação

WhatsApp deve usar provedor oficial ou configurável no backend. E-mail deve usar SMTP ou provedor transacional. Falha de comunicação nunca deve liberar acesso automaticamente.
