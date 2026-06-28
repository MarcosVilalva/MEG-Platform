# Arquitetura

## Regra principal

> Tela exibe. Core calcula. Storage persiste.

## Camadas

### apps/web
Interface React.

### packages/core
Regras financeiras.

### packages/ui
Componentes visuais reutilizáveis.

### packages/shared
Tipos e contratos.

### packages/analytics
Análises históricas, tendências e comparativos.

### packages/intelligence
IA, insights, replay e simulações.

## Diretriz

Nenhuma tela deve conter regra financeira crítica.
