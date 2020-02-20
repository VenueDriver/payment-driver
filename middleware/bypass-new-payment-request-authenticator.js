const PaymentRequestAuthorizer = require('../lib/PaymentRequestAuthorizer');
const Response = require('../lib/Response')
const Debugger = require('../lib/Debugger/debug')

async function bypassNewPaymentRequestAuthenticator(event, context) {
  Debugger.debug(["\nBypassNewPaymentRequestAuthenticator\n"]);
  const authorizer = new PaymentRequestAuthorizer();

  let paymentRequestRequestPayload = null;

  try {
    let accessToken = authorizer.getValidAccessTokenFromQueryParams(event);
    paymentRequestRequestPayload = authorizer.decode(accessToken);
    if(paymentRequestRequestPayload){
      global.handler.paymentRequestRequestPayload = paymentRequestRequestPayload;
      Debugger.debug(["Token Payload:",global.handler.paymentRequestRequestPayload]);
      global.handler.queryParams = `?payment-request-token=${accessToken}`;
      global.handler.skipAuthentication = true;
    }
  }
  catch (error) {
    Debugger.printError(['Error getting token from query params: ',error]);
  }

  if(!paymentRequestRequestPayload){
    return new Response('302').redirect('payment-requests')
  }
}

module.exports = bypassNewPaymentRequestAuthenticator;
