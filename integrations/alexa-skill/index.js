'use strict';

const Alexa = require('ask-sdk-core');
const https = require('https');

const intentMap = {
  FinancialOverviewIntent: 'overview',
  PendingBillsIntent: 'pending',
  NextDueIntent: 'next-due',
  BalanceIntent: 'balance',
  MonetaryBalanceIntent: 'monetary-balance',
  BenefitBalanceIntent: 'benefit-balance',
  MonthlyIncomeIntent: 'monthly-income',
  MonthlyExpensesIntent: 'monthly-expenses',
  ProjectedClosingIntent: 'projected-closing',
  BillsInDaysIntent: 'due-in-days',
  BillsNextDaysIntent: 'due-next-days',
  BillsOnDateIntent: 'due-on-date',
  OverdueBillsIntent: 'overdue'
};

function classifyNaturalQuestion(value, previousIntent = 'overview') {
  const text = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/beneficio|alimentacao|vale/.test(text)) return 'benefit-balance';
  if (/receita|recebi|entrou|entrada|ganhei/.test(text)) return 'monthly-income';
  if (/despesa|gastei|paguei|gasto|saidas/.test(text)) return 'monthly-expenses';
  if (/vencid|atrasad|em atraso/.test(text)) return 'overdue';
  if (/proxim|vencimento|vence|vencer/.test(text)) return 'next-due';
  if (/pendente|falta pagar|em aberto|a pagar/.test(text)) return 'pending';
  if (/fechar|projecao|vai sobrar|depois de pagar|sobra/.test(text)) return 'projected-closing';
  if (/saldo|dinheiro|disponivel|tenho na conta/.test(text)) return 'monetary-balance';
  if (/panorama|resumo|situacao|como estao|como estou/.test(text)) return 'overview';
  if (/^e\b|^agora\b|^tambem\b/.test(text) && previousIntent) return previousIntent;
  return 'overview';
}

async function askMeg(intent, query = {}) {
  const apiUrl = String(process.env.MEG_API_URL || '').replace(/\/$/, '');
  const secret = String(process.env.MEG_ALEXA_SKILL_SECRET || '');
  if (!apiUrl || !secret) throw new Error('MEG_SKILL_NOT_CONFIGURED');
  const payload = JSON.stringify({ intent, query });
  const panorama = await new Promise((resolve, reject) => {
    const request = https.request(`${apiUrl}/notifications/alexa/skill`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
        'x-alexa-skill-secret': secret
      },
      timeout: 6_000
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`MEG_API_${response.statusCode || 0}:${body.slice(0, 160)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`MEG_API_INVALID_JSON:${error instanceof Error ? error.message : String(error)}`));
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('MEG_API_TIMEOUT')));
    request.on('error', reject);
    request.end(payload);
  });
  return panorama;
}

function responseFromMeg(handlerInput, panorama, intent = 'overview') {
  const attributes = handlerInput.attributesManager.getSessionAttributes() || {};
  attributes.lastFinancialIntent = intent;
  attributes.lastFinancialData = panorama?.data || null;
  handlerInput.attributesManager.setSessionAttributes(attributes);
  const reprompt = panorama.reprompt || 'O que mais você quer saber sobre suas finanças?';
  return handlerInput.responseBuilder
    .speak(`${panorama.speech} O que mais você quer saber?`)
    .reprompt(reprompt)
    .withSimpleCard(panorama.cardTitle, panorama.cardText)
    .withShouldEndSession(false)
    .getResponse();
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const panorama = await askMeg('overview');
    return responseFromMeg(handlerInput, panorama, 'overview');
  }
};

const FinancialIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (Boolean(intentMap[Alexa.getIntentName(handlerInput.requestEnvelope)])
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'NaturalFinancialQueryIntent');
  },
  async handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const days = Number(Alexa.getSlotValue(handlerInput.requestEnvelope, 'days'));
    const date = Alexa.getSlotValue(handlerInput.requestEnvelope, 'date');
    const question = Alexa.getSlotValue(handlerInput.requestEnvelope, 'question');
    const attributes = handlerInput.attributesManager.getSessionAttributes() || {};
    const intent = intentName === 'NaturalFinancialQueryIntent'
      ? classifyNaturalQuestion(question, attributes.lastFinancialIntent || 'overview')
      : intentMap[intentName];
    const panorama = await askMeg(intent, {
      ...(Number.isFinite(days) ? { days } : {}),
      ...(date ? { date } : {})
    });
    return responseFromMeg(handlerInput, panorama, intent);
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const text = 'Você pode falar comigo naturalmente sobre saldo, receitas, despesas, contas pendentes, vencimentos e projeção do mês. Por exemplo, diga: como estão minhas finanças?';
    return handlerInput.responseBuilder
      .speak(text)
      .reprompt('O que você quer saber sobre suas finanças?')
      .withShouldEndSession(false)
      .getResponse();
  }
};

const StopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && ['AMAZON.CancelIntent', 'AMAZON.StopIntent'].includes(Alexa.getIntentName(handlerInput.requestEnvelope));
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Até logo. O MEG continua cuidando da sua agenda financeira.')
      .withShouldEndSession(true)
      .getResponse();
  }
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    const text = 'Não entendi essa consulta financeira. Você pode perguntar, por exemplo: quanto tenho disponível, quanto gastei este mês ou quais são os próximos vencimentos?';
    return handlerInput.responseBuilder
      .speak(text)
      .reprompt('O que você quer saber sobre suas finanças?')
      .withShouldEndSession(false)
      .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() { return true; },
  handle(handlerInput, error) {
    console.error(error);
    const text = 'O MEG não conseguiu consultar sua base agora. Aguarde alguns segundos e tente novamente.';
    return handlerInput.responseBuilder.speak(text).withShouldEndSession(true).getResponse();
  }
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    FinancialIntentHandler,
    HelpIntentHandler,
    StopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
