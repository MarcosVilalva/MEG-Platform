'use strict';

const Alexa = require('ask-sdk-core');
const https = require('https');

const intentMap = {
  FinancialOverviewIntent: 'overview',
  PendingBillsIntent: 'pending',
  NextDueIntent: 'next-due',
  BalanceIntent: 'balance',
  BillsInDaysIntent: 'due-in-days',
  BillsNextDaysIntent: 'due-next-days',
  BillsOnDateIntent: 'due-on-date',
  OverdueBillsIntent: 'overdue'
};

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
      // Alexa encerra a Lambda hospedada em aproximadamente oito segundos.
      // Retornamos uma resposta amigavel antes desse limite quando a API esta
      // acordando, em vez de deixar a Skill falhar com timeout generico.
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

function responseFromMeg(handlerInput, panorama) {
  return handlerInput.responseBuilder
    .speak(panorama.speech)
    .withSimpleCard(panorama.cardTitle, panorama.cardText)
    .withShouldEndSession(true)
    .getResponse();
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    return responseFromMeg(handlerInput, await askMeg('overview'));
  }
};

const FinancialIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Boolean(intentMap[Alexa.getIntentName(handlerInput.requestEnvelope)]);
  },
  async handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const days = Number(Alexa.getSlotValue(handlerInput.requestEnvelope, 'days'));
    const date = Alexa.getSlotValue(handlerInput.requestEnvelope, 'date');
    return responseFromMeg(handlerInput, await askMeg(intentMap[intentName], {
      ...(Number.isFinite(days) ? { days } : {}),
      ...(date ? { date } : {})
    }));
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const text = 'Você pode perguntar: quais são os próximos vencimentos, como estão minhas finanças, quais contas vencem daqui a cinco dias, o que vence nos próximos sete dias, quais contas vencem em uma data ou quais contas estão vencidas.';
    return handlerInput.responseBuilder.speak(text).withShouldEndSession(true).getResponse();
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
    const text = 'Não entendi. Pergunte, por exemplo: qual é o panorama das minhas finanças?';
    return handlerInput.responseBuilder.speak(text).withShouldEndSession(true).getResponse();
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
