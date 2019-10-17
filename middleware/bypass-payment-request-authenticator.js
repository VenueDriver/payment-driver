const querystring = require('querystring')
const PaymentRequestAuthorizer = require('../lib/PaymentRequestAuthorizer');

async function bypassPaymentRequestAuthenticator(event, context) {
  console.log("\nBypassPaymentRequestAuthenticator\n");
  const authorizer = new PaymentRequestAuthorizer();

  try {
    if (event.queryStringParameters &&
        event.queryStringParameters.id &&
        event.queryStringParameters.created_at) {
      global.handler.skipAuthentication = true;
    }
  }
  catch (error) {
    console.log(error);
  }
}

module.exports = bypassPaymentRequestAuthenticator;
