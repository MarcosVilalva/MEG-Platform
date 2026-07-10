# Publicação da MEG Platform

Esta entrega configura a publicação automática do frontend no GitHub Pages.

## Fluxo

1. Alterações aprovadas entram na branch `main`.
2. O GitHub Actions executa `npm ci` e `npm run build`.
3. O conteúdo de `apps/web/dist` é publicado no GitHub Pages.

## Endereço esperado

`https://marcosvilalva.github.io/MEG-Platform/`

## Configuração necessária no GitHub

Em `Settings > Pages`, selecione `GitHub Actions` como fonte de publicação.
