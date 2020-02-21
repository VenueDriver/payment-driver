const querystring = require('querystring')
const PaymentRequestAuthorizer = require('../lib/PaymentRequestAuthorizer');
const Logger = require('../lib/Logger/log')

async function bypassPaymentRequestAuthenticator(event, context) {
  Logger.info(["\nBypassPaymentRequestAuthenticator\n"]);

  try {
    if (event.queryStringParameters &&
        event.queryStringParameters.id &&
        event.queryStringParameters.created_at) {
        Logger.info(["Bypass Payment Request Authenticator: An ID and created_at are both present, so skipping authentication."]);
      global.handler.skipAuthentication = true;
    } else {
      Logger.info(["Bypass Payment Request Authenticator: No ID / created_at combination present, so continuing with normal authentication."]);
    }
  }
  catch (error) {
    Logger.error(['Error skipping request authenticator: ',error]);
  }
}

module.exports = bypassPaymentRequestAuthenticator;
