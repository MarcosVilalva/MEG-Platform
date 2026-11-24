# Etapa 10 | Issue #699 | APKs 706/707/708 e WebView original, caracterização incremental
**Data:** 24/11/2026. **Estado:** INVESTIGAÇÃO EM CURSO, SEM PROTOCOLO DEFINITIVO DE COMPATIBILIDADE. Nenhum writer financeiro, APK instalada, produção, Render, Supabase ou banco real alterado. PR #705 permanece Draft. Este é um documento de evidência **antes** da implementação produtiva.

## 1. Proveniência e versão
GitHub Release pública `android-latest` contém 200 APKs numeradas (400–708, com lacunas), além de `MEG-Financas.apk` e manifesto. Estas são versões **disponíveis** para download, não contagem de instalações ativas. Existe a release separada `android-rc1-latest`.
- APK 706: 6.715.743 bytes, SHA256 `d12bd3b1995609cfdc62db314b1916b54f94e83ee8c3e9d77a89fb3d77f942c1`.
- APK 707: 6.715.710 bytes, SHA256 `0a4554d1881e736e088e9db05eb7b5592e95667f5d1d5aeb1a17247cf926e6da`.
- APK 708: 6.715.918 bytes, SHA256 `1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6`.
- Manifesto público `app-version.json`: `versionCode:708`, `versionName:2.0.708`, `mandatory:false`; não comprova que versões antigas tenham sido desinstaladas.
- GitHub downloads observados: 706=0, 707=0, 708=9, artefato genérico `MEG-Financas.apk`=148. São contadores do serviço, **não telemetria de aparelhos ou de usuários**. Versões instaladas/ativas em produção **DESCONHECIDAS**, sem autorização para ler sistemas produtivos.
- As três APKs contêm 12 bundles JS em `assets/public/assets/`, o transporte com `AbortSignal.timeout(45000)`, `/finance/events` e `/app-state`, mas **não** a rota literal `/app-state/transactions` nos bundles examinados. Similitude estática não prova compatibilidade de UI ou cliente inteiro.

## 2. Emulador de APK original, sem reempacotamento
GitHub Actions [45428199211](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45428199211), SUCCESS: APK 708 original baixada e SHA conferido, Android Emulator API35 descartável, regras de `iptables` instaladas **antes de lançar o APK** bloqueando conexões públicas; WebView publicada iniciou em `https://localhost`, Chrome DevTools disponível (`webview_devtools_remote`). Sem uso da API produtiva.

GitHub Actions [45429026249](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45429026249), SUCCESS **do probe**, mas login não passou: APK habilita CapacitorHttp nativo; interceptação inicial CDP não alcançou a requisição de login. Erro visível foi `Não foi possível entrar`. Isso caracteriza limitação do harness, não problema confirmado de login do produto.

GitHub Actions [45429705877](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45429705877), SUCCESS: somente **na WebView descartável**, `window.fetch` restaurado a partir de `window.CapacitorWebFetch`, mantendo o bundle JS/UI do APK intacto e bloqueio de egress; login com usuário fictício chegou à Home após alinhar o mock ao contrato `/finance/phoenix-preview`. Este shim muda o transporte nativo para browser fetch **no teste**. Portanto o teste da interface não equivale a validar todos os aspectos nativos do CapacitorHttp.

GitHub Actions [45430224460](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45430224460), SUCCESS: Home real da APK exibiu conta de teste com saldo fictício R$500,00, o botão inferior `Novo`, sem dados reais.

GitHub Actions [45430724549](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45430724549), SUCCESS: clique no botão real `Novo` abriu seletor `O que deseja lançar?` com `Despesa`, `Receita` e `Alimentação`.

GitHub Actions [45431219269](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45431219269), SUCCESS: `Despesa` abriu o formulário original, com Descrição (autocomplete), Categoria*, Modalidade à vista/crédito, Forma de pagamento*, Conta*, Data do lançamento, Valor, Situação Pago/Pendente, Observações e botão `Salvar lançamento`. Campo de texto e valor não são provas de POST até confirmar o fluxo.

GitHub Actions [45431813357](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45431813357), SUCCESS do harness: primeiro preenchimento sintético avançou até seletor Categoria; a automação não selecionou opção cujo texto possuía uma segunda linha (`Alimentação QA\\nPessoal`). Nenhum `POST /finance/events` foi disparado. Corrigido **somente seletor de QA**; próxima execução [45432322635](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45432322635) em andamento à data desta versão do documento. Não atribuir sucesso/fracasso financeiro ao código com base em erro do seletor QA.

## 3. Contratos identificados em código original
A APK usa `POST /finance/events` para lançamento, além de writers específicos para benefício, cartão e transferências. A função comum de transporte do JS embarcado foi testada isoladamente contra HTTP local: 409/422/503 geram rejeição **sem retry nesta função**; 401 gera refresh e mais uma requisição; timeout rejeita. **Não deduzir ausência de listeners/retries de tela ou de fila local a partir dessa prova isolada.**
O bundle da APK contém lógica de UI para `POSSIBLE_DUPLICATE`, incluindo `Confirmar possível duplicidade`, e mantém referência de operação preparada em fluxos Phoenix. A compatibilidade do protocolo real, inclusive resposta API/recibo, depende da validação em WebView e deve ser medida, não presumida.
O banco IndexedDB dos bundles 706/707/708 inclui `meg-phoenix-runtime`/`monthly-snapshots`: é cache de **leitura**, não prova de outbox financeiro. Não foram localizados marcadores literais `outbox`, `addEventListener("online"` nem `navigator.onLine` no bundle principal; isso não exclui outras filas, listeners ou comportamentos de outras versões.

## 4. Gates ainda não comprovados
1. Payload JSON **exato** do `POST /finance/events` gerado pelo formulário real ao confirmar Despesa fictícia.
2. Timeout após commit em API local e replay subsequente: observar e comparar IDs/headers/body, estado da tela, confirmação e comportamento.
3. Reações visuais reais a 409, 422 e `POSSIBLE_DUPLICATE`: mensagem, travamento, retry manual, event listeners, número de HTTP requests no intervalo observado.
4. Forçar desconexão/reconexão da WebView e verificar possíveis envios adicionais automáticos e persistência local. Nenhuma negativa absoluta pode ser declarada com observação curta.
5. Comparar execução do transporte **nativo CapacitorHttp** com modo browser-fallback de QA; a extração original não autoriza atribuir payload/timeout ao native quando somente o fallback foi exercitado.
6. Versões ativas em produção: requer fonte de telemetria autorizada/privada e identidade de versão confiável. GitHub releases e downloads não suprem esse dado.

## 5. Limite de segurança e decisão provisória
Não introduzir erro HTTP novo que cause loop na APK velha. **Não usar HTTP 200 pendente**: no transporte JS original, `200 {pending:true}` é interpretado como sucesso e invalida cache. HTTP 200 só para operação realmente confirmada/replay idempotente comprovado. Não suprimir despesas legítimas iguais com hash de valor/data/descrição. **Nenhum protocolo definitivo aprovado** e nenhuma alteração de writer financeiro até fechar os gates acima.

## 6. Artefatos de QA
- `.github/workflows/meg-stage10-issue699-apk708-webview-original.yml`, runner GitHub isolado, APK hash pinada, firewall antes do start.
- `scripts/meg-stage10-issue699-apk708-real-ui-probe.mjs`: harness WebView CDP e API local sintética; não constitui teste de produção.
- Arquivos TEMP locais para auditoria estática 706/707/708 foram baixados no NITROMEG e não instalados.
