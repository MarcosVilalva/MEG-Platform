# Sprint 012 — Gestão de usuários e aprovação de acesso

## Entregas

- confirmação de senha no cadastro;
- novos cadastros entram como `PENDING` e sem acesso;
- administrador principal configurado como `m_vilalva@hotmail.com`;
- primeiro cadastro desse e-mail assume o perfil `ADMIN` quando ainda não existir administrador;
- login bloqueado para usuários pendentes, rejeitados ou bloqueados;
- tela administrativa de usuários e permissões;
- aprovação com escolha entre ADMIN, MANAGER, OPERATOR e VIEWER;
- rejeição, bloqueio e reativação;
- revogação das sessões ao bloquear o usuário;
- auditoria das solicitações e alterações de acesso.

## Regras de perfil

- `VIEWER`: consulta;
- `OPERATOR`: consulta, inclusão e alteração;
- `MANAGER`: consulta, inclusão, alteração e exclusão financeira;
- `ADMIN`: controle total e gestão de usuários.

## Notificação por e-mail

A solicitação registra o e-mail do administrador. O envio SMTP efetivo será conectado na Sprint de comunicação; até lá, as solicitações permanecem disponíveis no painel administrativo.