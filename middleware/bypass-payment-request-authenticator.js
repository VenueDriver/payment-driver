const querystring = require('querystring')
const PaymentRequestAuthorizer = require('../lib/PaymentRequestAuthorizer');

async function bypassPaymentRequestAuthenticator(event, context) {
  console.log("\nBypassPaymentRequestAuthenticator\n");

  try {
    if (event.queryStringParameters &&
        event.queryStringParameters.id &&
        event.queryStringParameters.created_at) {
      console.log("Bypass Payment Request Authenticator: An ID and created_at are both present, so skipping authentication.");
      global.handler.skipAuthentication = true;
    } else {
      console.log("Bypass Payment Request Authenticator: No ID / created_at combination present, so continuing with normal authentication.");
    }
  }
  catch (error) {
    console.log(error);
  }
}

module.exports = bypassPaymentRequestAuthenticator;
