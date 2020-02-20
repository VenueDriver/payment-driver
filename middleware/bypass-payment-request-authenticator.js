const querystring = require('querystring')
const PaymentRequestAuthorizer = require('../lib/PaymentRequestAuthorizer');
const Debugger = require('../lib/Debugger/debug')

async function bypassPaymentRequestAuthenticator(event, context) {
  Debugger.info(["\nBypassPaymentRequestAuthenticator\n"]);

  try {
    if (event.queryStringParameters &&
        event.queryStringParameters.id &&
        event.queryStringParameters.created_at) {
        Debugger.info(["Bypass Payment Request Authenticator: An ID and created_at are both present, so skipping authentication."]);
      global.handler.skipAuthentication = true;
    } else {
      Debugger.info(["Bypass Payment Request Authenticator: No ID / created_at combination present, so continuing with normal authentication."]);
    }
  }
  catch (error) {
    Debugger.printError(['Error skipping request authenticator: ',error]);
  }
}

module.exports = bypassPaymentRequestAuthenticator;
