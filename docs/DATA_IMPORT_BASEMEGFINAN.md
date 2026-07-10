# Importação de dados financeiros por CSV

O MEG possui um importador privado para bases pessoais em CSV com normalização de codificação, datas, moeda, categorias e formas de pagamento.

## Segurança e auditoria

- O arquivo original não é enviado ao GitHub.
- Cada importação recebe um hash para evitar duplicação acidental.
- Cada linha permanece vinculada ao lançamento criado.
- Possíveis duplicidades são sinalizadas, sem exclusão automática.
- Linhas inválidas são colocadas em quarentena para revisão.
- Credenciais e caminhos locais são fornecidos somente durante a execução.

## Execução

```powershell
$env:DATABASE_URL="CONEXAO_PRIVADA_DO_SUPABASE"
$env:IMPORT_USER_EMAIL="EMAIL_DO_USUARIO"
npm run db:generate
npm run db:push
npm run db:import:basemeg -- "CAMINHO_LOCAL_DO_ARQUIVO.csv"
```

Mantenha o arquivo original como backup até conferir os resultados no sistema.
