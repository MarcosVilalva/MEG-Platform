# Sprint 012 — Aprovação de usuários e permissões

## Entregas

- Confirmação de senha no cadastro.
- Novos usuários ficam pendentes e sem acesso.
- Administrador padrão para notificações: `m_vilalva@hotmail.com`.
- Primeiro administrador da instalação permanece com acesso imediato.
- Tela exclusiva para ADMIN listar, aprovar, rejeitar, ativar e desativar usuários.
- Alteração dos perfis ADMIN, MANAGER, OPERATOR e VIEWER.
- Revogação das sessões ao desativar um usuário.
- Auditoria das solicitações e alterações de acesso.

## E-mail

A solicitação fica persistida e registrada no log da API. O envio real por e-mail será ativado quando o provedor SMTP/transacional for configurado na Sprint de comunicação. A variável `ADMIN_EMAIL` permite alterar o destinatário sem modificar o código.