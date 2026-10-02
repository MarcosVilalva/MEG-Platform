# MEG WEB NEXT — STATUS OFICIAL DA RECONSTRUÇÃO

> Este arquivo é a fonte de verdade para qualquer continuação da reconstrução Web.
> Antes de alterar a interface Web, leia este documento e `WEB-LEGACY-REMOVAL.md`.

## 1. Decisão arquitetural

O cliente Web será reconstruído em modo **clean-room**, tela por tela.

O objetivo NÃO é reconstruir o sistema financeiro. Devem ser preservados:
- API e contratos de backend;
- autenticação;
- regras financeiras;
- persistência e gateways de escrita;
- lançamentos, baixas e conciliações;
- cartões, faturas e benefício;
- filtros, histórico e relatórios;
- dados normalizados, auditoria e demais regras de domínio já validadas.

O que será substituído progressivamente é a **camada visual/estrutural Web antiga**.

## 2. Fonte de verdade visual

Referência oficial: **5 pranchas Web aprovadas em 01/10/2026**.

Regra de prioridade:
1. pranchas Web aprovadas;
2. regras funcionais e dados reais;
3. contratos de domínio;
4. código visual antigo somente enquanto uma tela ainda não foi migrada.

As pranchas Android NÃO são referência de layout do Web.

## 3. Referência principal de desktop

Alvo principal de validação visual:
- monitor: 1920 x 1080;
- Windows: escala 100%;
- Chrome: zoom 100%;
- navegador maximizado.

A aplicação continua responsiva. O alvo Full HD é referência de composição, não breakpoint rígido.

## 4. Regras obrigatórias

1. Uma tela por vez.
2. Uma implementação oficial por módulo.
3. Tela aprovada pelo usuário entra em estado VALIDADA.
4. Após validação e publicação verde, o legado substituído por aquela tela deve ser removido no mesmo ciclo.
5. Não manter componentes antigos comentados, escondidos com `display:none`, ou duplicados como backup.
6. Não criar novas versões nomeadas `v12`, `v13`, `v15`, `final2`, `wow`, `old`, `legacy` ou equivalentes na árvore Web Next.
7. Android fica congelado durante a reconstrução Web.
8. Código visual Web Next não pode depender diretamente de CSS Phoenix antigo.
9. Regras de negócio não podem ser reimplementadas dentro de componentes visuais.
10. CI verde não equivale a validação visual. A aprovação da tela é explícita.
11. Git é o backup. Código morto não permanece no runtime por medo de perda.
12. Toda remoção deve ocorrer após busca de consumidores e CI completo.

## 5. Processo obrigatório por tela

`mapear → construir clean-room → CI → publicar preview/produção → validação visual → remover legado substituído → CI → congelar`

Se uma tela ainda não foi validada, o legado necessário pode continuar ativo temporariamente e deve constar em `WEB-LEGACY-REMOVAL.md`.

## 6. Estado atual

Última base conhecida antes da fundação clean-room:
- branch oficial: `main`;
- governança clean-room consolidada em `main`: `8a1ad79b427c356bd0478060dd464515e5ce5a88` (PR #512);
- fundação Web Next: mesclada em `main` no commit `61049d51dc0cc17e710366073a36802eb8e3de64`;
- Home Web Next: branch `feat/web-next-home`, ainda não validada pelo usuário;
- cliente visual em produção: Phoenix + camadas MEG Web Revolution/Fidelity;
- Web Next ainda NÃO está roteado em produção;
- situação do runtime atual: **transitória**.

A Home do PR #511 serviu como diagnóstico e evolução visual, mas NÃO é considerada a Home clean-room definitiva.

## 7. Matriz de migração

| Área | Referência | Estado clean-room | Legado removido |
|---|---|---|---|
| Fundação Web / shell | Prancha 1 + sistema visual das 5 pranchas | MERGED CLEAN-ROOM · `61049d51` | N/A |
| Home | Prancha 1 | EM IMPLEMENTAÇÃO CLEAN-ROOM · competência mensal pronta para validação após merge | NÃO — aguardando validação |
| Lançamentos | Prancha 2 | NÃO INICIADA | NÃO |
| Novo / Editar lançamento | Prancha 2 | NÃO INICIADA | NÃO |
| Pendentes / baixa | Prancha 3 | NÃO INICIADA | NÃO |
| Cartões / Central / Fatura | Prancha 3 | NÃO INICIADA | NÃO |
| Benefício | Prancha 3 | NÃO INICIADA | NÃO |
| Relatórios | Prancha 4 | NÃO INICIADA CLEAN-ROOM | NÃO |
| Fluxo de Caixa | Prancha 4 | NÃO INICIADA CLEAN-ROOM | NÃO |
| Planejamento / Metas | Prancha 4 | NÃO INICIADA CLEAN-ROOM | NÃO |
| Categorias / Cadastros | Prancha 4/5 | NÃO INICIADA | NÃO |
| Histórico | Prancha 5 | NÃO INICIADA | NÃO |
| Configurações / Perfil | Prancha 5 | NÃO INICIADA | NÃO |
| Modais / alertas / toasts / loading / vazios | Pranchas 2–5 | NÃO INICIADA | NÃO |

## 8. Estrutura alvo

Nova camada visual criada em `apps/web/src/web-next/`:
```
apps/web/src/web-next/
  app/
  components/
  screens/
  styles/
  data/
```

Princípios:
- `styles/`: tokens, shell e componentes canônicos;
- `components/`: componentes visuais sem regra financeira própria;
- `screens/`: composição de tela;
- `data/`: única fronteira permitida entre Web Next e os contratos/gateways existentes;
- sem imports diretos de folhas Phoenix na árvore Web Next.

## 9. Continuidade entre chats

Em qualquer novo chat:
1. abrir este arquivo;
2. abrir `WEB-LEGACY-REMOVAL.md`;
3. verificar HEAD da `main`;
4. verificar PRs abertos `web-next`;
5. continuar a primeira linha da matriz que estiver EM CONSTRUÇÃO ou PRÓXIMA.

Não inferir o estado a partir de arquivos `v12/v13/v15` antigos.
