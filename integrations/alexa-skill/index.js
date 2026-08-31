'use strict';

const Alexa = require('ask-sdk-core');
const https = require('https');

const intentMap = {
  FinancialOverviewIntent: 'overview',
  FinancialAnalysisIntent: 'financial-analysis',
  FinancialRiskIntent: 'financial-risk',
  SavingsOpportunitiesIntent: 'savings-opportunities',
  SpendingAnalysisIntent: 'spending-analysis',
  CashMarginIntent: 'cash-margin',
  FinancialScenarioIntent: 'scenario-by-date',
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

const advisorIntents = new Set([
  'financial-analysis',
  'financial-risk',
  'savings-opportunities',
  'spending-analysis',
  'cash-margin',
  'scenario-by-date'
]);

function classifyNaturalQuestion(value, previousIntent = 'overview') {
  const text = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/maior risco|risco financeiro|ponto de atencao|mais preocupa|preocupante/.test(text)) return 'financial-risk';
  if (/economiz|reduzir.{0,20}gasto|cortar.{0,20}gasto|o que posso cortar|oportunidade.{0,20}econom/.test(text)) return 'savings-opportunities';
  if (/gastando mais|maiores despesas|maior despesa|maior gasto|mais pesou|gastos maiores/.test(text)) return 'spending-analysis';
  if (/quanto posso gastar|margem livre|quanto posso usar|quanto posso comprometer/.test(text)) return 'cash-margin';
  if (/analise financeira|analisa minhas financas|analise minhas financas|diagnostico financeiro|saude financeira|como estou financeiramente/.test(text)) return 'financial-analysis';
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

function requestSkillId(handlerInput) {
  return String(
    handlerInput?.requestEnvelope?.context?.System?.application?.applicationId
    || handlerInput?.requestEnvelope?.session?.application?.applicationId
    || ''
  ).trim();
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function spokenMoney(value) {
  return numberValue(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function spokenMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ''))) return '';
  const [year, month] = String(value).split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function spokenDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return String(value || '');
  const [year, month, day] = String(value).split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function buildOverviewSpeech(panorama) {
  const data = panorama?.data || {};
  const month = String(data.month || '');
  const monthLabel = spokenMonth(month);
  if (!monthLabel) return String(panorama?.speech || '');

  const available = numberValue(data.monetaryAvailable);
  const income = numberValue(data.monetaryIncome);
  const paid = numberValue(data.monetaryPaidExpense);
  const pending = numberValue(data.monetaryPendingExpense);
  const projected = numberValue(data.projectedClosing);
  const benefit = numberValue(data.benefitBalance);
  const nextDueDate = String(data.nextDueDate || '');
  const nextDueTotal = numberValue(data.nextDueTotal);
  const monthName = monthLabel.replace(/ de \d{4}$/u, '');

  const pendingSentence = pending > 0
    ? `Ainda há ${spokenMoney(pending)} em contas monetárias em aberto em ${monthName}.`
    : `Não há contas monetárias em aberto em ${monthName}.`;

  let nextSentence = 'Não há próximo vencimento cadastrado.';
  if (nextDueDate) {
    const nextMonth = nextDueDate.slice(0, 7);
    if (nextMonth > month) {
      nextSentence = `O próximo compromisso já é do mês seguinte, em ${spokenDate(nextDueDate)}, no total de ${spokenMoney(nextDueTotal)}.`;
    } else {
      nextSentence = `O próximo compromisso é em ${spokenDate(nextDueDate)}, no total de ${spokenMoney(nextDueTotal)}.`;
    }
  }

  const projectionSentence = pending > 0
    ? projected >= 0
      ? `Depois de quitar essas pendências, a projeção é fechar ${monthName} com ${spokenMoney(projected)}.`
      : `Depois dessas pendências, faltariam ${spokenMoney(Math.abs(projected))} para fechar ${monthName} sem déficit.`
    : `Mantido o cenário atual, ${monthName} fecha com saldo de ${spokenMoney(projected)}.`;

  return `Panorama de ${monthLabel}. Você tem ${spokenMoney(available)} disponíveis. `
    + `Em ${monthName}, entraram ${spokenMoney(income)} e já foram pagos ${spokenMoney(paid)} em despesas. `
    + `${pendingSentence} ${nextSentence} ${projectionSentence} `
    + `O benefício alimentação está em ${spokenMoney(benefit)}.`;
}

const SkillIdRequestInterceptor = {
  process(handlerInput) {
    const expected = String(process.env.MEG_ALEXA_SKILL_ID || '').trim();
    if (!expected) return;
    const actual = requestSkillId(handlerInput);
    if (!actual || actual !== expected) throw new Error('MEG_ALEXA_SKILL_ID_MISMATCH');
  }
};

async function askMeg(intent, query = {}) {
  const apiUrl = String(process.env.MEG_API_URL || '').replace(/\/$/, '');
  const secret = String(process.env.MEG_ALEXA_SKILL_SECRET || '');
  if (!apiUrl || !secret) throw new Error('MEG_SKILL_NOT_CONFIGURED');
  const payload = JSON.stringify({ intent, query });
  const endpoint = advisorIntents.has(intent) ? '/notifications/alexa/advisor' : '/notifications/alexa/skill';
  const panorama = await new Promise((resolve, reject) => {
    const request = https.request(`${apiUrl}${endpoint}`, {
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
  const speech = intent === 'overview' ? buildOverviewSpeech(panorama) : panorama.speech;
  return handlerInput.responseBuilder
    .speak(`${speech} O que mais você quer saber?`)
    .reprompt(reprompt)
    .withSimpleCard(panorama.cardTitle, panorama.cardText)
    .withShouldEndSession(false)
    .getResponse();
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes() || {};
    attributes.awaitingFinancialChoice = true;
    handlerInput.attributesManager.setSessionAttributes(attributes);
    const text = 'MEG Finanças aberto. Você quer um panorama geral, uma análise financeira ou prefere consultar uma informação específica, como saldo, despesas, receitas, contas pendentes, benefício ou próximos vencimentos?';
    return handlerInput.responseBuilder
      .speak(text)
      .reprompt('Diga panorama geral, análise financeira, ou faça uma pergunta, por exemplo: quanto tenho disponível?')
      .withShouldEndSession(false)
      .getResponse();
  }
};

const OtherInformationIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'OtherInformationIntent';
  },
  handle(handlerInput) {
    const text = 'Claro. O que você quer consultar? Posso falar sobre saldo disponível, receitas, despesas, contas pendentes, benefícios, próximos vencimentos, projeção do mês ou fazer uma análise financeira mais completa.';
    return handlerInput.responseBuilder
      .speak(text)
      .reprompt('O que você quer saber sobre suas finanças?')
      .withShouldEndSession(false)
      .getResponse();
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
    attributes.awaitingFinancialChoice = false;
    handlerInput.attributesManager.setSessionAttributes(attributes);
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
    const text = 'Você pode falar comigo naturalmente sobre saldo, receitas, despesas, contas pendentes, vencimentos, benefícios e projeção do mês. Também posso fazer uma análise financeira, apontar o maior risco, mostrar os maiores gastos, sugerir onde revisar despesas e simular quanto sobra depois de pagar as contas até uma data.';
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
    const text = 'Não entendi essa consulta financeira. Você pode pedir um panorama geral, uma análise financeira, perguntar quanto tem disponível, onde está gastando mais, qual é o maior risco ou quais são os próximos vencimentos.';
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
  .addRequestInterceptors(SkillIdRequestInterceptor)
  .addRequestHandlers(
    LaunchRequestHandler,
    OtherInformationIntentHandler,
    FinancialIntentHandler,
    HelpIntentHandler,
    StopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
