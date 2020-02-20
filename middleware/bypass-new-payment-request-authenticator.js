const PaymentRequestAuthorizer = require('../lib/PaymentRequestAuthorizer');
const Response = require('../lib/Response')
const Logger = require('../lib/Logger/log')

async function bypassNewPaymentRequestAuthenticator(event, context) {
  Logger.debug(['BypassNewPaymentRequestAuthenticator']);
  const authorizer = new PaymentRequestAuthorizer();

  let paymentRequestAccessToken = null;

  try {
    let accessToken = authorizer.getValidAccessTokenFromQueryParams(event);
    paymentRequestAccessToken = authorizer.decode(accessToken);
    if(paymentRequestAccessToken){
      global.handler.paymentRequestAccessToken = paymentRequestAccessToken;
      Logger.debug(["Token Payload:",global.handler.paymentRequestAccessToken]);
      global.handler.queryParams = `?payment-request-token=${accessToken}`;
      global.handler.skipAuthentication = true;
    }
  }
  catch (error) {
    Logger.error(['Error getting access token from query params: ',error]);
  }

  if(!paymentRequestAccessToken){
    Logger.debug(['No access token in payment request.  Redirecting to payment-requests']);
    return new Response('302').redirect('payment-requests')
  }
}

module.exports = bypassNewPaymentRequestAuthenticator;
