# Importação da base `basemegfinan.csv`

## Auditoria da fonte

- Codificação: CP850.
- Separador: ponto e vírgula.
- Linhas de dados: 2.839.
- Período: 01/06/2025 a 10/12/2026.
- Receitas originais: 497.
- Despesas originais: 2.342.
- Estornos/cashbacks com despesa negativa: 30.
- Repetições exatas: 74 linhas adicionais em 58 grupos.
- Linha sem receita e sem despesa: 1.
- Observações que contêm datas seriais do Excel: 95.

## Mapeamento

| CSV | Banco MEG | Regra |
|---|---|---|
| DATA | FinancialEvent.date | Converte serial do Excel para UTC |
| TP LANÇAMENTO | FinancialEvent.type | Receita ou despesa |
| DESCRIÇÃO | FinancialEvent.description | Preservada |
| RECEITA($) / DESPESA (R$) | amount / signedAmount | Decimal brasileiro convertido sem arredondamento textual |
| CLASSIFIÇÃO DA DESPESA | Category.group | Classificação ampla |
| GRUPO | Category.name | Categoria específica |
| FORMA DE PAGAMENTO | PaymentMethod | Cadastro reutilizado |
| SITUAÇÃO | FinancialEvent.status | PAGO ? paid; PENDENTE ? planned |
| MODADLIDADE / OBSERVAÇÕES | FinancialEvent.notes | Preservadas para consulta |
| Linha completa | ImportedRow.rawData | JSON original auditável |

## Regras de integridade

- Nenhuma duplicidade é excluída automaticamente.
- Duplicidades ficam marcadas por `duplicateOfRow`.
- Estornos e cashbacks tornam-se entradas positivas e não aumentam despesas.
- A linha inválida fica em quarentena com `issueCode`, sem lançamento financeiro.
- Cada importação possui SHA-256 do arquivo, contagens e vínculo com o usuário.
- Repetir o mesmo arquivo não duplica lançamentos já importados.

## Resultado esperado

- 2.838 lançamentos importados.
- 1 linha em quarentena.
- 2.186 despesas pagas.
- 125 despesas planejadas.
- 524 receitas/estornos pagos.
- 3 receitas planejadas.

## Execução

Depois que a API e o usuário administrador existirem no Supabase:

```powershell
$env:DATABASE_URL="CONEXAO_DO_SUPABASE"
$env:IMPORT_USER_EMAIL="m_vilalva@hotmail.com"
npm run db:generate
npm run db:push
npm run db:import:basemeg -- "C:\Users\m_vil\OneDrive\Projetos\MEG-Platform-Novo\basemegfinan.csv"
```

A conexão deve ser definida apenas no terminal local ou no Render, nunca gravada no repositório.
