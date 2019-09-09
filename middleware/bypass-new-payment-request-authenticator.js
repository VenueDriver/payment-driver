const PaymentRequestAuthorizer = require('../lib/PaymentRequestAuthorizer');
const Response = require('../lib/Response');

async function bypassNewPaymentRequestAuthenticator(event, context) {
  console.log("\nBypassNewPaymentRequestAuthenticator\n");

  if (!global.handler.httpMethod == "GET") {
    return;
  }

  const authorizer = new PaymentRequestAuthorizer();

  try {
    let accessToken = authorizer.getValidAccessTokenFromQueryParams(event);

    if (accessToken) {
      const cookieWithAccessToken = authorizer.getAccessTokenWrapperInCookie(accessToken, event);
      return new Response('302').redirect('payment-requests-new',{ headers: cookieWithAccessToken });
    }

    accessToken = authorizer.getValidAccessTokenFromCookie(event);

    if (accessToken) {
      global.handler.paymentRequestRequestPayload = authorizer.verify(accessToken);
      global.handler.skipAuthentication = true;
    }
  }
  catch (error) {
    console.log("Error: " + JSON.stringify(error));
    const expiredAccessTokenCookie = authorizer.getExpiredAccessTokenWrapperInCookie();
    return new Response('302').redirect('payment-requests-new',{ headers: expiredAccessTokenCookie });
  }
}

module.exports = bypassNewPaymentRequestAuthenticator;

