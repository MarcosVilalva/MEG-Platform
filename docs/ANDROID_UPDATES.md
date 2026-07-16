# Atualização do aplicativo Android

## Experiência do usuário

Ao abrir o aplicativo, o MEG consulta `downloads/app-version.json`. Quando o `versionCode` publicado é maior que o instalado, uma janela informa a nova versão e permite:

- atualizar imediatamente;
- adiar até a próxima abertura;
- ler o resumo das melhorias;
- baixar o APK oficial e validar seu SHA-256 antes da instalação.

O Android sempre exige confirmação do usuário para instalar uma atualização fora da Play Store. Na primeira vez, também pode solicitar a permissão **Permitir desta fonte** para o MEG.

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
