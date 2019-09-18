const PaymentRequestAuthorizer = require('../lib/PaymentRequestAuthorizer');

async function bypassNewPaymentRequestAuthenticator(event, context) {
  console.log("\nBypassNewPaymentRequestAuthenticator\n");
  const authorizer = new PaymentRequestAuthorizer();

  try {
    let accessToken = authorizer.getValidAccessTokenFromQueryParams(event);
    global.handler.paymentRequestRequestPayload = authorizer.verify(accessToken);
    global.handler.queryParams = `?payment-request-token=${accessToken}`;
    global.handler.skipAuthentication = true;
  }
  catch (error) {
    console.log(error);
  }
}

module.exports = bypassNewPaymentRequestAuthenticator;
