# Auditoria de UX e consistência do MEG Finanças

## Objetivo

Revisar o sistema completo para que todas as telas apresentem linguagem clara, descrições financeiras amigáveis, hierarquia visual consistente e comportamento adequado em desktop e celular.

## Regras obrigatórias

1. Nenhuma tela operacional deve exibir identificadores técnicos, UUIDs, números de linha de importação ou códigos internos como texto principal.
2. Receitas e despesas devem ser identificadas prioritariamente pela descrição do lançamento.
3. Conta, grupo, categoria, forma de pagamento e cartão devem aparecer como informações secundárias.
4. O nome do usuário, situação da sincronização, versão e ação Sair devem permanecer no rodapé do menu lateral.
5. A ação Sair não deve ocupar espaço na área principal ou encobrir métricas.
6. Estados de carregamento, vazio, erro e sucesso devem usar mensagens claras e padronizadas.
7. Valores monetários devem usar o padrão pt-BR.
8. Exclusões devem exigir confirmação e identificar o registro pela descrição.

## Fases da revisão

### 1. Estrutura global

- [x] Perfil e botão Sair posicionados no rodapé do menu lateral.
- [ ] Revisar menu recolhido, menu móvel e áreas seguras do Android.
- [ ] Padronizar cabeçalhos, filtros e botões principais.
- [ ] Verificar sobreposição em resoluções pequenas.

### 2. Textos e identificação dos registros

- [ ] Substituir números de linha e IDs por descrição de receita ou despesa.
- [ ] Aplicar fallback amigável quando a descrição estiver vazia.
- [ ] Exibir número de parcela somente como informação complementar.
- [ ] Revisar títulos, legendas, mensagens e erros em todas as telas.

### 3. Módulos

- [ ] Painel
- [ ] Análises
- [ ] Receitas
- [ ] Fluxo de caixa
- [ ] Lançamentos
- [ ] Cartões
- [ ] Orçamentos
- [ ] Pendentes
- [ ] Cadastros
- [ ] Usuários e permissões
- [ ] Gestão comercial
- [ ] Ajustes e integrações

### 4. Qualidade

- [ ] Testes de desktop e celular.
- [ ] Testes de carregamento com API lenta.
- [ ] Testes com textos longos.
- [ ] Testes com base vazia e grande volume de lançamentos.
- [ ] `npm run check` sem erros.
- [ ] Smoke test de produção aprovado.

## Critério de aceite

A revisão somente será concluída quando todas as telas apresentarem descrições financeiras compreensíveis, sem exposição desnecessária de identificadores técnicos, com layout estável no navegador e no aplicativo Android.
