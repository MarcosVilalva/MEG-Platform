# MEG Web Evolution | Etapa 10 | Diagnostico Android 2.0.708 instalado (somente leitura)

## Objetivo
Conferir **no dispositivo que o operador possui**, sem inferir pela release publica, a versao instalada do pacote `br.com.megfinancas.app`. Nao equivale a testar funcionamento offline ou outbox.

## Script
`scripts/meg-stage10-android-installed-readonly.ps1` nao instala nem atualiza APK, nao faz backup do aplicativo, nao consulta o conteudo do banco local, nao roda comandos de sync, nao apaga cache, nao muda configuracao do Android e nao exibe serial/IMEI. Usa exclusivamente `adb devices` e `adb shell dumpsys package` para leitura de metadados.

O operador deve ter ADB disponivel e o dispositivo conectado e autorizado para diagnostico USB por ele. O script nao altera essa permissao. Se estiverem conectados 0 ou varios dispositivos autorizados, falha fechado e informa somente a quantidade.

No PowerShell aberto na raiz do repositorio, com o dispositivo conectado:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\meg-stage10-android-installed-readonly.ps1
```

O resultado e exibido e copiado para a area de transferencia (quando disponivel). Apenas dados nao identificaveis sao emitidos: status, nome de pacote, versao, versionCode e flag de presenca. Em seguida, encaminhar **somente** esse relatorio. Se aparecer `ADB_NAO_LOCALIZADO`, corrigir a disponibilidade da ferramenta antes de tentar novamente; nao instalar programas automaticamente.

## Limites e gate
Uma versao confirmada nao prova que o binario seja identico ao APK publicado nem que trate 409, tombstones, exclusao/reinclusao ou outbox offline. Para o marco 5, testes funcionais posteriores devem usar usuario e lancamentos de QA, sem tocar nos dados pessoais, sem alterar a APK nem reintroduzir migracao de identidade. Nao executar 409/replay em producao ou no banco financeiro real.

**Estado:** documento de diagnostico preparado, sem acesso fisico ao dispositivo neste chat e sem resultados apresentados. Marco 5 permanece P0, percentual oficial nao muda.

## Correcao 17/11/2026 | erro de parser do script anterior

O arquivo publicado no commit c3145dc estava corrompido: o padrao Regex na linha 55 foi truncado e uma secao duplicada no meio da expressao. Isso explica os erros UnexpectedToken, bracket e string sem terminador relatados pelo operador no PowerShell 5.1. O defeito esta no codigo publicado, **nao no Windows ou na APK**. Refeito o script completo do zero e adicionada uma etapa **real de parser PowerShell** no workflow PG17 da Etapa 10; a verificacao de sintaxe e gate, nao apenas TypeScript. O operador deve baixar sempre o SHA corrigido e nao reutilizar a copia em %TEMP% (sem download atualizado).

## Resultado comunicado pelo operador, 17/11/2026

Após corrigir a sintaxe do script e estabelecer autorização ADB USB, o operador comunicou o retorno exato do diagnóstico somente leitura: `STATUS=METADADOS_INSTALADOS_CONFIRMADOS`, pacote `br.com.megfinancas.app`, `VERSAO_INSTALADA=2.0.708`, `VERSION_CODE=708`, `PACOTE_PRESENTE=SIM`, `TESTE_OFFLINE_OUTBOX=NAO_EXECUTADO`, `DADOS_FINANCEIROS_EXTRAIDOS=NAO`.

**Conclusão restrita:** versão e código de versão do aplicativo instalado foram identificados pelo relatório do operador. Isso NÃO comprova SHA do APK instalado, sincronização offline, tratamento 409, tombstones, ou integridade financeira do cliente. O marco 5 continua aberto, não executar teste de escrita sobre dados reais.
