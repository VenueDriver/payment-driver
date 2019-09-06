function collectNewPaymentRequestParams(payload) {
  const { first: first_name, last: last_name, ...otherAttributes } = payload;
  return { first_name, last_name, ...otherAttributes }
}

async function fetchAdditionalParamsFromNewPaymentRequestTokenPayload(event, context) {
  console.log("\nFetchAdditionalParamsFromNewPaymentRequestTokenPayload\n");

  if (global.handler.paymentRequestRequestPayload) {
    const payload = global.handler.paymentRequestRequestPayload;
    global.handler.newPaymentRequestParams = collectNewPaymentRequestParams(payload);
    console.log('New payment request params ', global.handler.newPaymentRequestParams);
    delete global.handler.paymentRequestRequestPayload;
  }

  console.log("additional parameters ", global.handler.additionalParams);
}

module.exports = fetchAdditionalParamsFromNewPaymentRequestTokenPayload;

