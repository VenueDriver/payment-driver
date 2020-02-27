const PaymentRequestAuthorizer = require('../lib/PaymentRequestAuthorizer');
const Response = require('../lib/Response')
const Logger = require('../lib/Logger/log')

async function bypassNewPaymentRequestAuthenticator(event, context) {
  Logger.debug(["\nBypassNewPaymentRequestAuthenticator\n"]);
  const authorizer = new PaymentRequestAuthorizer();

  let paymentRequestRequestPayload = null;

  try {
    let accessToken = authorizer.getValidAccessTokenFromQueryParams(event);
    paymentRequestRequestPayload = authorizer.decode(accessToken);
    if(paymentRequestRequestPayload){
      global.handler.paymentRequestRequestPayload = paymentRequestRequestPayload;
      Logger.debug(["Token Payload:",global.handler.paymentRequestRequestPayload]);
      global.handler.queryParams = `?payment-request-token=${accessToken}`;
      global.handler.skipAuthentication = true;
    }
  }
  catch (error) {
    Logger.error(['Error getting token from query params: ',error]);
  }

  if(!paymentRequestRequestPayload){
    Logger.info(["\nNo authorization token.  Redirecting to payment-requests.\n"]);
    return new Response('302').redirect('payment-requests')
  }
}

module.exports = bypassNewPaymentRequestAuthenticator;
