# PR #648 - Auditoria visual de Lançamentos e Novo Lançamento

Data da evidência: 26/10/2026 UTC. Escopo: branch `feature/meg-web-new-launch-visual-official`, não mesclada à main.

## Evidência recebida

Arquivo entregue pelo usuário: `731fc7930-2026-10-26T00-58-28-789Z.zip`.

- 18 capturas reais de Playwright: Lançamentos, seleção de tipo, Despesa (início/rodapé) e Receita (início/rodapé), em 1440×900, 1024×768 e 390×844.
- `diagnostico-visual.json`: `pageHorizontalOverflowPx=0` nas 18 observações.
- DataGrid: largura visível de 1182 px (1440), 773 px (1024), 342 px (390). `scrollWidth` de 1821 px em desktop/tablet, com rolagem interna. No mobile não excedeu os 342 px, usando sua apresentação adaptativa.
- Diálogo: 1238×820 px em 1440×900 sem rolagem adicional; 880×747 px em 1024×768, com conteúdo total de 860 px (despesa) ou 843 px (receita); 388×842 px em 390×844 com conteúdo total de 1962 px (despesa) ou 1951 px (receita). A rolagem adicional ocorre dentro do diálogo, não na página.

As capturas não são evidência de todas as ações financeiras, dados de saldo ou aprovação visual do usuário.

## Comparação com os prints oficiais

Referências vigentes do Projeto: `Imagem do ChatGPT 3 de out. de 2026, 16_54_48-4.png` para Lançamentos e `Novo lançamento financeiro neon.png` para o formulário. Os prints oficiais são a referência obrigatória; a interface não pode fabricar métricas ou fluxo de pagamento/cartão ausentes do escopo seguro atual.

| Região | Constatação do ZIP | Medida adotada |
|---|---|---|
| Lançamentos, 1440 e 1024 | Coluna monetária assinada fora da área inicial devido a muitas colunas | Trazer `signedAmount` da API para a terceira posição (depois de Data/Descrição), preservar todas as demais em rolagem interna |
| Lançamentos, persistência de DataGrid | Preferência de ordem anterior poderia esconder o efeito do novo padrão | Versionar a chave de persistência do layout da grade, sem alterar dados da API |
| Formulário 1024×768 | Três painéis comprimem campos; data aparece cortada na captura de início | Distribuir dois painéis e colocar resumo abaixo exatamente no limite 1024 px, com rolagem interna |
| Formulário 1024×768, rodapé | Fragmentos de campos aparecem acima do cabeçalho sticky quando o diálogo rola | Preencher a área interna superior do cabeçalho com seu fundo, removendo a faixa transparente |
| Formulário e seletor 390×844 | Formulário longo, mas sem rolagem horizontal; botões continuam disponíveis | Manter rolagem estrutural e alvos de toque; não cortar conteúdo para reduzir artificialmente a altura |
| Evidência automatizada | Chromium automático em locale inglês mostra data nativa no formato en-US | Fixar `locale=pt-BR`, fuso `America/Sao_Paulo` e acrescentar medidas de largura do campo e posição dos elementos sticky |
| KPIs, gráfico, painel auxiliar | Componentes do print oficial não constam na implementação isolada atual | **Pendente:** devem consumir read models financeiros canônicos, sem mocks/valores inventados |

## Regras funcionais preservadas

- O formulário solicita status `planned` e usa o writer `event-mutation.ts`. A API determina o estado final, inclusive `paid` para receitas conforme a política canônica existente; nenhuma lógica de valor/saldo/status foi criada no React.
- Transferência, cartão, benefício e pagamento direto não foram habilitados artificialmente.
- O DataGrid recebe `signedAmount` original da API, e sua formatação monetária existente é mantida.
- Android, main, produção e banco de dados reais não foram alterados.

## O que foi implementado nesta rodada

1. Prioridade da coluna `Valor registrado (R$)` e redução criteriosa de larguras iniciais na `LaunchesScreen.tsx`.
2. Reorganização do formulário ao chegar a 1024 px e tratamento do cabeçalho sticky em `new-launch.css`.
3. Novas medidas e padronização pt-BR em `scripts/meg-pr648-capturar-telas.mjs`.
4. Chave de preferência do DataGrid versionada, apenas para permitir aplicação da nova ordem no preview.

## Gates e pendências

**Não validados nesta rodada:** build web, testes financeiros completos, navegação automatizada sob novos commits, inspeção por imagens da versão pós-correção, revisão mobile específica por interação, saldo/ledger do lançamento fictício, receita futura, autorização explícita do layout e merge.

A PR #648 permanece Draft. Para nova captura: atualizar o clone em Codespaces, reiniciar o preview da porta 5174, abrir outro terminal e executar `node scripts/meg-pr648-capturar-telas.mjs`; comparar o novo ZIP ao anterior e às referências oficiais. O script é de leitura e não grava transações.
