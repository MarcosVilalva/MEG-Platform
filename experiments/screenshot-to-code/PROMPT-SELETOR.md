# Prompt de geração no screenshot-to-code (Etapa A)

Use **somente** a imagem original do seletor do MEG Web (`Imagem do ChatGPT 3 de out. de 2026, 17_31_26.png`) como verdade visual.

Gere código real de **um componente React e CSS isolado**, não uma ilustração, com fidelidade a dimensões relativas do modal, moldura, largura da introdução à esquerda, quatro cards à direita, faixa inferior, hierarquia de títulos, tipografia, bordas, proporções, ícones e espaçamentos.

Restrições:
1. Quatro tipos na ordem Despesa, Receita, Transferência e Benefício. **Transferência e Benefício desabilitados**: nenhuma operação financeira poderá ser executada por essas opções.
2. A imagem mostra modalidades como Cartão e Parcelamento, mas essas modalidades **não podem ser ativadas** nesta etapa. Despesa só pode ser pendente na integração futura.
3. Não reconstruir logos, montanhas, artes de cartões ou gráficos artificiais; se asset oficial não estiver disponível separadamente, declarar a limitação. Não usar screenshot como background.
4. Não inventar categorias, contas, saldos, datas ou montantes demonstrativos. Não gerar writes, endpoints ou regras financeiras. A geração é exclusivamente visual.
5. Não reutilizar UI antiga, CSS antigo ou bibliotecas não existentes no MEG. Manter cores/tokens do padrão MEG e nenhuma rolagem horizontal.
6. Responsivo em 1672×941, 1366×768, 1024×600, 910×400 e 390×844; sem altura fixa de conteúdo; um scroll interno no diálogo; cabeçalho/rodapé opacos.
7. Teclado com rótulos acessíveis, foco visível e contido, Esc e retorno ao gatilho. Respeitar reduced-motion.
8. Gerar arquivo React completo e arquivo CSS completo. Separar comportamento visual de integração financeira, que será implementada depois com writer canônico existente.

Critérios: comparação de screenshot em resolução original; diferenciar explicitamente divergências causadas por assets indisponíveis e operações bloqueadas; não declarar aprovação visual antes do usuário.
