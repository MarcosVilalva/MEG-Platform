# MEG EVOLUTION — PRÉ-VALIDAÇÃO VISUAL OBRIGATÓRIA

> Esta etapa existe para impedir que o usuário seja usado como detector primário de erro visual.

## Regra

Nenhuma tela do MEG Evolution pode ser apresentada como **pronta**, **validada**, **finalizada**, **pode abrir para conferir** ou equivalente somente porque:
- compilou;
- o CI ficou verde;
- o deploy terminou;
- não houve erro funcional;
- o layout “parece correto” pelo código.

Antes de comunicar prontidão, deve existir uma **pré-validação visual interna**.

## Fluxo obrigatório

`implementar → CI → publicar/preview → capturar screenshot real → comparar com a prancha oficial → listar divergências → corrigir → recapturar → repetir → somente então apresentar ao usuário`

A captura deve ser feita no navegador real pelo workflow `MEG Evolution Visual Preflight`.

## Responsabilidade do assistente

O assistente deve fazer a primeira comparação visual e não transferir essa triagem para o usuário.

Antes de afirmar que uma tela está pronta:
1. obter a captura real da implementação;
2. abrir/inspecionar a captura;
3. comparar lado a lado com a referência oficial correspondente;
4. verificar composição, proporção, posição, tipografia, cores, iluminação, profundidade, ícones, espaçamentos e comportamento;
5. corrigir divergências evidentes sem esperar que o usuário as aponte;
6. repetir a captura após a correção;
7. só então solicitar a validação final do usuário.

O usuário continua sendo a autoridade de aprovação final, mas **não é o QA visual primário**.

## Critérios mínimos da comparação

### Composição
- posição e peso dos blocos;
- proporção entre áreas;
- alinhamentos;
- ocupação do viewport;
- ausência de espaços vazios incompatíveis com a referência.

### Marca e tipografia
- logo correta;
- proporções corretas da marca;
- títulos e números com escala compatível;
- subtítulos legíveis;
- peso e hierarquia próximos da prancha.

### Materiais
- fundo e atmosfera;
- glass;
- bordas;
- brilho;
- sombras;
- profundidade;
- contraste.

### Componentes
- cards;
- sidebar/topbar;
- campos;
- botões;
- gráficos;
- chips;
- modais;
- ícones;
- carrosséis;
- scroll interno.

### Responsividade
Sempre que a tela tiver variante desktop e vertical:
- validar ambas antes de declarar o módulo pronto;
- não aceitar simples redução proporcional;
- recompor a interface conforme a prancha correspondente.

## Resoluções de referência atuais

- Loading: `1254 × 1254`;
- Login vertical: `1086 × 1448`;
- Login desktop: `1448 × 1086`;
- Home desktop: `1672 × 941`;
- Home + Novo Lançamento: `1672 × 941`.

Essas resoluções correspondem às pranchas-mestre reafirmadas em 02/10/2026. Outras resoluções podem ser testadas adicionalmente, mas não substituem a comparação principal.

## Estados permitidos

Antes da pré-validação:
- EM CONSTRUÇÃO;
- CAPTURA PENDENTE;
- EM COMPARAÇÃO;
- EM CORREÇÃO.

Após a pré-validação interna:
- PRÉ-VALIDADA / AGUARDANDO APROVAÇÃO DO USUÁRIO.

Somente após aprovação explícita:
- VALIDADA / CONGELADA.

## Linguagem proibida antes da pré-validação

Não usar:
- “está pronto”;
- “ficou certo”;
- “pode abrir para validar”;
- “concluído”;
- “finalizado”;
- “100% fiel”.

Use o estado real, por exemplo:
- “implementação publicada; estou na comparação visual”;
- “encontrei divergências e ainda estou corrigindo”;
- “pré-validação concluída; agora vale sua aprovação final”.

## Regra para falha do mecanismo de captura

Se por qualquer motivo não for possível obter ou inspecionar a captura real, não declarar a tela pronta.

Nesse caso, o estado permanece **CAPTURA PENDENTE** até a pré-validação ser possível.
