#!/usr/bin/env bash
set -euo pipefail

# A região da Skill não deve herdar silenciosamente a região selecionada no
# CloudShell. Para pt-BR/Américas usamos us-east-1 por padrão, região recomendada
# pela Amazon para menor latência. Para sobrescrever conscientemente, use
# MEG_ALEXA_AWS_REGION=<região>.
TARGET_REGION="${MEG_ALEXA_AWS_REGION:-us-east-1}"
AWS_REGION="$TARGET_REGION"
AWS_DEFAULT_REGION="$TARGET_REGION"
GITHUB_REPOSITORY="${MEG_GITHUB_REPOSITORY:-MarcosVilalva/MEG-Platform}"
GITHUB_BRANCH="${MEG_GITHUB_BRANCH:-main}"
DEPLOY_ROLE_NAME="${MEG_GITHUB_DEPLOY_ROLE_NAME:-MEG-GitHub-AlexaDeploy}"
EXECUTION_ROLE_NAME="${MEG_LAMBDA_EXECUTION_ROLE_NAME:-MEG-AlexaLambdaExecution}"
LAMBDA_FUNCTION_NAME="${MEG_ALEXA_LAMBDA_FUNCTION:-meg-financas-alexa-skill}"
OIDC_HOST="token.actions.githubusercontent.com"
OIDC_URL="https://${OIDC_HOST}"
OIDC_AUDIENCE="sts.amazonaws.com"

command -v aws >/dev/null 2>&1 || {
  echo "AWS CLI não encontrado. Execute este script no AWS CloudShell ou instale a AWS CLI v2."
  exit 1
}
command -v python3 >/dev/null 2>&1 || {
  echo "Python 3 não encontrado. Execute este script no AWS CloudShell."
  exit 1
}

export AWS_REGION AWS_DEFAULT_REGION

IDENTITY_JSON="$(aws sts get-caller-identity --output json)"
ACCOUNT_ID="$(printf '%s' "$IDENTITY_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["Account"])')"
CALLER_ARN="$(printf '%s' "$IDENTITY_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["Arn"])')"
PARTITION="$(printf '%s' "$CALLER_ARN" | cut -d: -f2)"

OIDC_PROVIDER_ARN="arn:${PARTITION}:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_HOST}"
DEPLOY_ROLE_ARN="arn:${PARTITION}:iam::${ACCOUNT_ID}:role/${DEPLOY_ROLE_NAME}"
EXECUTION_ROLE_ARN="arn:${PARTITION}:iam::${ACCOUNT_ID}:role/${EXECUTION_ROLE_NAME}"
LAMBDA_FUNCTION_ARN="arn:${PARTITION}:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:${LAMBDA_FUNCTION_NAME}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Conta AWS detectada e autenticada."
echo "Região da Alexa/Lambda: ${AWS_REGION}"
echo "Repositório autorizado: ${GITHUB_REPOSITORY}"
echo "Branch autorizada: ${GITHUB_BRANCH}"

if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" >/dev/null 2>&1; then
  echo "Provedor OIDC do GitHub já existe."
  if ! aws iam get-open-id-connect-provider \
    --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" \
    --query 'ClientIDList' \
    --output text | tr '\t' '\n' | grep -Fxq "$OIDC_AUDIENCE"; then
    aws iam add-client-id-to-open-id-connect-provider \
      --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" \
      --client-id "$OIDC_AUDIENCE"
  fi
else
  echo "Criando provedor OIDC do GitHub Actions..."
  aws iam create-open-id-connect-provider \
    --url "$OIDC_URL" \
    --client-id-list "$OIDC_AUDIENCE" \
    --tags Key=Application,Value=MEG Key=Purpose,Value=GitHubActions >/dev/null
fi

cat >"$TMP_DIR/lambda-trust.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

if aws iam get-role --role-name "$EXECUTION_ROLE_NAME" >/dev/null 2>&1; then
  echo "Atualizando role de execução da Lambda..."
  aws iam update-assume-role-policy \
    --role-name "$EXECUTION_ROLE_NAME" \
    --policy-document "file://$TMP_DIR/lambda-trust.json"
else
  echo "Criando role de execução da Lambda..."
  aws iam create-role \
    --role-name "$EXECUTION_ROLE_NAME" \
    --description "MEG Finanças Alexa Lambda execution role" \
    --assume-role-policy-document "file://$TMP_DIR/lambda-trust.json" \
    --tags Key=Application,Value=MEG Key=Purpose,Value=AlexaLambda >/dev/null
fi

aws iam attach-role-policy \
  --role-name "$EXECUTION_ROLE_NAME" \
  --policy-arn "arn:${PARTITION}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"

cat >"$TMP_DIR/github-trust.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "$OIDC_PROVIDER_ARN"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_HOST}:aud": "$OIDC_AUDIENCE",
          "${OIDC_HOST}:sub": "repo:${GITHUB_REPOSITORY}:ref:refs/heads/${GITHUB_BRANCH}"
        }
      }
    }
  ]
}
JSON

if aws iam get-role --role-name "$DEPLOY_ROLE_NAME" >/dev/null 2>&1; then
  echo "Atualizando role OIDC do GitHub Actions..."
  aws iam update-assume-role-policy \
    --role-name "$DEPLOY_ROLE_NAME" \
    --policy-document "file://$TMP_DIR/github-trust.json"
else
  echo "Criando role OIDC do GitHub Actions..."
  aws iam create-role \
    --role-name "$DEPLOY_ROLE_NAME" \
    --description "MEG Finanças GitHub Actions deploy role for Alexa Lambda" \
    --assume-role-policy-document "file://$TMP_DIR/github-trust.json" \
    --max-session-duration 3600 \
    --tags Key=Application,Value=MEG Key=Purpose,Value=GitHubActions >/dev/null
fi

cat >"$TMP_DIR/deploy-policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ManageMegAlexaLambda",
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:GetFunction",
        "lambda:GetFunctionConfiguration",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:AddPermission",
        "lambda:RemovePermission",
        "lambda:GetPolicy",
        "lambda:InvokeFunction"
      ],
      "Resource": "$LAMBDA_FUNCTION_ARN"
    },
    {
      "Sid": "PassMegAlexaExecutionRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "$EXECUTION_ROLE_ARN",
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "lambda.amazonaws.com"
        }
      }
    }
  ]
}
JSON

aws iam put-role-policy \
  --role-name "$DEPLOY_ROLE_NAME" \
  --policy-name MEG-AlexaLambdaDeploy \
  --policy-document "file://$TMP_DIR/deploy-policy.json"

# IAM pode levar alguns segundos para propagar antes da primeira criação da Lambda.
sleep 8

cat <<OUTPUT

Bootstrap AWS concluído.

Cadastre no GitHub Actions:

Secret AWS_ALEXA_DEPLOY_ROLE_ARN
$DEPLOY_ROLE_ARN

Secret AWS_ALEXA_LAMBDA_EXECUTION_ROLE_ARN
$EXECUTION_ROLE_ARN

Variable AWS_ALEXA_REGION
$AWS_REGION

Variable AWS_ALEXA_LAMBDA_FUNCTION
$LAMBDA_FUNCTION_NAME

Ainda são necessários no GitHub:
- Variable ALEXA_SKILL_ID, copie o ID amzn1.ask.skill... no Alexa Developer Console.
- Secret MEG_ALEXA_SKILL_SECRET, use exatamente o mesmo valor configurado como ALEXA_SKILL_SECRET na API do MEG.

Depois disso, execute o workflow "Deploy MEG Alexa Skill to AWS" ou faça uma alteração em integrations/alexa-skill/ na branch main.
OUTPUT
