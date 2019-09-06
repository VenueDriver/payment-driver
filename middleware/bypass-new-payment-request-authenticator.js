const NewPaymentRequestTokenVerifier = require('../lib/NewPaymentRequestTokenVerifier').NewPaymentRequestTokenVerifier;

async function bypassNewPaymentRequestAuthenticator(event, context) {
  console.log("\nBypassAuthenticationIfToken\n");
  
  if (!global.handler.httpMethod == "GET") {
    return;
  }
  
  try {
    const token = event['queryStringParameters'] && event['queryStringParameters']['token'];
    global.handler.paymentRequestRequestPayload = NewPaymentRequestTokenVerifier.verify(token);
    global.handler.skipAuthentication = true;
  }
  catch (error) {
    console.log("Bypassing authentication error:", error);
  }
}

module.exports = bypassNewPaymentRequestAuthenticator;

