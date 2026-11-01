# MEG Web Evolution | Home 06 | Pré-confirmação visual de 01/11/2026

**Status autorizado pelo usuário:** **PRÉ-CONFIRMAÇÃO (referência provisória), NÃO HOMOLOGAÇÃO FINAL**.

## Baseline imutável de comparação e rollback

- Código da Home: `25b167f38c9a302cf83ba079227ab7887fb6870a` (marco anterior à alteração apenas documental deste registro).
- PR original: [#651](https://github.com/MarcosVilalva/MEG-Platform/pull/651), Draft, sem merge. A versão atual da PR pode ganhar commits de documentação; **o SHA acima é a referência visual do baseline**, independentemente do HEAD futuro.
- Render: `meg-home-06-panorama-clean`; deploy `dep-dbjksoijnfac738a56dg`, confirmado `live` em 01/11/2026.
- URL de validação do baseline: https://meg-home-06-panorama-clean.onrender.com/home-06-panorama.html?v=25b167f38c9a302cf83ba079227ab7887fb6870a
- Teste de nove resoluções: [Home Panorama #41132153131](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/41132153131), SUCCESS, com artefatos de screenshots.
- Evidência de pré-confirmação: vídeo fornecido pelo usuário `11-39-22.mp4`, gravado no Chrome em 1920×1080; mostra interação de carrossel, navegação e rolagem da Home.
- Feedback literal: **"melhorou bastante, podemos salvar esta como pré confirmação"**. Não interpretar como autorização para merge, aprovação final ou conclusão da etapa.

## Pontos já satisfatórios que devem ser preservados

A composição em dark teal/verde, logo oficial, identidade visual, painel de saldo, quatro indicadores financeiros, carrossel circular de cartões, benefícios, cinco ações rápidas, gráfico de fluxo e duas tabelas DataGrid. Preservar fluxo de navegação atual e avisos de funcionalidades ainda não disponíveis. Não confundir fixture de preview com dados reais.

## Problemas visuais observados no vídeo (a corrigir em candidato isolado)

1. Em desktop largo, o lado esquerdo do topo possui espaço ocioso entre os quatro indicadores financeiros e o término do painel de cartões à direita. Equilibrar altura dos blocos sem inventar um novo KPI nem deslocar dados financeiros.
2. Em Ações rápidas, a quinta ação aparece solitária na segunda linha, com grande espaço em branco à direita. Propor distribuição 3+2 simétrica/centrada, preservando as cinco ações e seus controles.
3. Refinar hierarquia, leitura e ritmo apenas nos limites do print oficial da Home (`Tela principal.png`) e das decisões mais recentes; não importar estética de bibliotecas externas nem alterar Shell/DataGrid compartilhados.

## Ferramentas e limites

- `DESIGN.md` derivado dos prints oficiais para transformar composição, eixos, espaçamentos e estados em critérios objetivos. Taste Skill pode apoiar a **inspeção**, mas sua instalação ainda não foi comprovada neste repositório.
- Cult UI, Refero e ShaderGradient são **referências de técnicas**, não autorização para instalar Tailwind, shadcn/ui, Three.js, fundos animados ou componentes legados sem avaliação de dependências e conformidade.
- Nova UI experimental em branch separada, comparada ao baseline. Não modificar `android/**`, `apps/web/src/mobile/**`, API financeira, escritores, Shell ou DataGrid aprovado.
- Todos os valores financeiros e estados continuam oriundos das autoridades canônicas; preview é fixture técnica isolada.

## Gates

- Verificar CSS responsivo nas resoluções 320, 360, 390, 640, 768, 1024, 1366, 1672, 1920; zero overflow horizontal da página, nenhuma sobreposição, alvos adequados.
- Conferir foto do candidato contra captura do baseline e print oficial; um teste verde não equivale a aprovação.
- Não mexer no deploy `live` pré-confirmado até haver um candidato superior e autorização para publicá-lo.
- Manter PR #651 Draft e não avançar para Lançamentos.
