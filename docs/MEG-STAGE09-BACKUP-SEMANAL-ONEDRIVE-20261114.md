# MEG: backup semanal cifrado para OneDrive

Estado: kit candidato. Nenhuma instalacao ou novo backup foi executado no notebook por este chat.

## Instalar uma vez no seu notebook

1. Extraia o ZIP em uma pasta local. Nao coloque senhas ou identidade age nessa pasta.
2. No Windows PowerShell 5.1, execute `& "CAMINHO\scripts\MEG-INSTALAR-BACKUP-SEMANAL.ps1"` como seu usuario Windows habitual.
3. Informe o host de Connect do projeto meg-financas, o caminho Linux da identidade age ja existente e o caminho Linux da CA oficial ja utilizada. A senha PostgreSQL deve ser digitada somente na janela privada de credenciais. Nao envie esses valores ao chat.
4. O instalador verifica hashes, protege a pasta local com ACL do usuario, guarda a senha com DPAPI e copia os scripts para WSL. Depois executa UMA exportacao de leitura com o script oficial, valida age integralmente, confere catalogo e SHA e copia somente arquivo cifrado e manifesto para OneDrive/MEG-Backups-Semanais.
5. A tarefa so e registrada se esse primeiro backup e a copia local passarem. Se falhar, nao reinstale repetidamente: preserve o estado e compartilhe apenas o marcador RESULTADO, sem arquivos privados. A instalacao incompleta nao e revertida automaticamente para evitar apagar dados.
6. Confirme os arquivos no OneDrive Web, baixe a copia cifrada e confronte SHA-256 com o manifesto local. A existencia da pasta local NAO comprova upload.

## Agenda e verificacao

- Tarefa: MEG-Backup-Semanal-OneDrive. Domingo as 10h no horario do Windows e ao entrar na sessao se o ultimo sucesso tiver sete dias ou mais.
- Notebook ligado, internet, sessao Windows disponivel, WSL e OneDrive sincronizando sao necessarios. Nao executa quando a maquina esta desligada. Nao promete periodicidade garantida se essas condicoes nao forem atendidas.
- Falha: no maximo uma tentativa automatica por dia, sem loop de pg_dump. Execucao manual pode usar `-Force` apos revisar a causa.
- Consulte o Agendador de Tarefas e `%LOCALAPPDATA%\MEG-Backup-Semanal\last-report.json`. O recibo distingue copia local validada de upload remoto, que permanece false ate verificacao independente.
- Nenhuma exclusao automatica de backups, nenhuma alteracao de banco e nenhum restore. As copias antigas permanecem preservadas. Controle espaco local/OneDrive antes de estabelecer retencao.
- Para pausar: desabilite a tarefa pelo Agendador. Nao apague chaves, backups ou credenciais sem preservar recuperacao independente.

## Limites de seguranca e recuperacao

A identidade age fica no filesystem Linux privado, nunca no OneDrive. A senha cifrada por DPAPI funciona apenas com o mesmo usuario no mesmo Windows. Qualquer processo com acesso a esse usuario pode usa-la; nao e isolamento contra comprometimento do computador. O kit nao cria usuarios PostgreSQL ou muda privilegios.

O backup logico e a chave-raiz Vault ja custodiada sao componentes distintos. Este kit NAO busca chave-raiz, nao inclui bytes de Storage nem configura automaticamente Auth/Realtime/Functions/Render. Nao substitui o ensaio de recuperacao gerenciada. Cada novo archive tem sua integridade verificada, mas restauracao funcional de cada copia nao e executada automaticamente.

## Viabilidade em 14/11/2026

A API publicada respondeu HTTP 200 em /ready com status ready e em /health com financialReady=true. /ready executa SELECT 1 via Prisma: o caminho API para PostgreSQL estava acessivel apesar da restricao dos servicos gerenciados. Isso NAO comprova login e operacoes financeiras de um usuario, nem garante disponibilidade futura na cota Free.

Renovacao do Supabase no painel: 27/11/2026. Prazo solicitado: 15/11/2026. Nao houve upgrade, deploy, merge, mudanca de Render ou custo. O Build Command produtivo inseguro continua impedindo deploy seguro ate correcao autorizada e gates. A PR #692 prepara essa correcao; a Web da Etapa 10 tem sua propria validacao, fora deste kit.
