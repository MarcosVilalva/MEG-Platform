# Atualização do aplicativo Android

## Experiência do usuário

Ao abrir o aplicativo, o MEG primeiro acorda a API e consulta `downloads/app-version.json`. Quando o `versionCode` publicado é maior que o instalado, o aplicativo:

- exibe o resumo da nova versão;
- inicia o download automaticamente;
- valida o SHA-256 do APK oficial;
- abre o instalador seguro do Android;
- somente depois de concluir ou dispensar essa etapa libera a biometria e o carregamento da sessão.

A ordem é obrigatória e sequencial: **API pronta -> atualização -> biometria -> sessão e dados**. A leitura do manifesto possui tentativas automáticas para redes móveis instáveis.

Na primeira atualização, o Android pode solicitar a permissão **Permitir desta fonte** para o MEG. O aplicativo aguarda o retorno e continua o download automaticamente. A confirmação final da instalação pertence ao Android e não pode ser suprimida por um aplicativo comum distribuído fora da Play Store.

## Assinatura permanente

O workflow usa estes Repository secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_STORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Para criar a chave uma única vez:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-android-signing.ps1
```

O script grava a chave e o arquivo `GITHUB-SECRETS.txt` na pasta `Documentos\MEG-Android-Signing`. Essa pasta deve possuir backup seguro e nunca deve ser enviada ao repositório.

## Primeira migração

Os APKs antigos eram builds de depuração sem assinatura permanente. Por isso, será necessário desinstalar uma única vez a versão antiga e instalar a primeira versão assinada 1.1. Depois dessa migração, todas as versões seguintes serão instaladas sobre a atual, sem desinstalação.

Os dados financeiros permanecem no banco em nuvem e voltam após o login.

## Publicação

O workflow `Build MEG Finanças Android APK`:

1. incrementa automaticamente o `versionCode`;
2. compila um APK release assinado;
3. calcula o SHA-256;
4. publica o APK e o manifesto no site;
5. permite que o aplicativo detecte a atualização na próxima abertura.
