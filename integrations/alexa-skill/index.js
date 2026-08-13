'use strict';

const Alexa = require('ask-sdk-core');

const intentMap = {
  FinancialOverviewIntent: 'overview',
  PendingBillsIntent: 'pending',
  NextDueIntent: 'next-due',
  BalanceIntent: 'balance'
};

async function askMeg(intent) {
  const apiUrl = String(process.env.MEG_API_URL || '').replace(/\/$/, '');
  const secret = String(process.env.MEG_ALEXA_SKILL_SECRET || '');
  if (!apiUrl || !secret) throw new Error('MEG_SKILL_NOT_CONFIGURED');
  const response = await fetch(`${apiUrl}/notifications/alexa/skill`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-alexa-skill-secret': secret
    },
    body: JSON.stringify({ intent })
  });
  if (!response.ok) throw new Error(`MEG_API_${response.status}`);
  return response.json();
}

function responseFromMeg(handlerInput, panorama) {
  return handlerInput.responseBuilder
    .speak(panorama.speech)
    .reprompt(panorama.reprompt)
    .withSimpleCard(panorama.cardTitle, panorama.cardText)
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
    return responseFromMeg(handlerInput, await askMeg(intentMap[Alexa.getIntentName(handlerInput.requestEnvelope)]));
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const text = 'Você pode perguntar: como estão minhas finanças, quanto tenho de saldo, quais contas estão pendentes ou qual é o próximo vencimento.';
    return handlerInput.responseBuilder.speak(text).reprompt(text).getResponse();
  }
};

const StopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && ['AMAZON.CancelIntent', 'AMAZON.StopIntent'].includes(Alexa.getIntentName(handlerInput.requestEnvelope));
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak('Até logo. O MEG continua cuidando da sua agenda financeira.').getResponse();
  }
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    const text = 'Não entendi. Pergunte, por exemplo: qual é o panorama das minhas finanças?';
    return handlerInput.responseBuilder.speak(text).reprompt(text).getResponse();
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
    return handlerInput.responseBuilder.speak(text).reprompt(text).getResponse();
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
