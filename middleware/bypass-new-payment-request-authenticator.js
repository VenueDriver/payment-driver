const PaymentRequestAuthorizer = require('../lib/PaymentRequestAuthorizer');

async function bypassNewPaymentRequestAuthenticator(event, context) {
  if(process.env.DEBUG){
  console.log("\nBypassNewPaymentRequestAuthenticator\n"); }
  const authorizer = new PaymentRequestAuthorizer();

  try {
    let accessToken = authorizer.getValidAccessTokenFromQueryParams(event);
    global.handler.paymentRequestRequestPayload = authorizer.decode(accessToken);
    if(process.env.DEBUG){
      console.log("Token Payload:",global.handler.paymentRequestRequestPayload); }
    global.handler.queryParams = `?payment-request-token=${accessToken}`;
    global.handler.skipAuthentication = true;
  }
  catch (error) {
    console.log(error);
  }
}

module.exports = bypassNewPaymentRequestAuthenticator;
