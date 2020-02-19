const MoneySanitizer = require('../lib/money/MoneySanitizer');

function collectNewPaymentRequestParams(payload) {
  const { first: first_name, last: last_name, ...otherAttributes } = payload;
  return { first_name, last_name, ...otherAttributes }
}

function sanitizePaymentRequestParamsValue(values) {
  const { amount, ...otherAttributes } =  values;
  return { ...otherAttributes, amount: MoneySanitizer.sanitize(amount) }
}

async function fetchAdditionalParamsFromNewPaymentRequestTokenPayload(event, context) {
  if(process.env.DEBUG){
    console.log("\nFetchAdditionalParamsFromNewPaymentRequestTokenPayload\n"); }

  if (global.handler.paymentRequestRequestPayload) {
    const payload = global.handler.paymentRequestRequestPayload;
    const paymentRequestParams = collectNewPaymentRequestParams(payload);
    global.handler.newPaymentRequestParams = sanitizePaymentRequestParamsValue(paymentRequestParams);
    console.log('New payment request params ', global.handler.newPaymentRequestParams);
    delete global.handler.paymentRequestRequestPayload;
  }

  if(process.env.DEBUG){
    console.log("additional parameters ", global.handler.additionalParams); }
}

module.exports = fetchAdditionalParamsFromNewPaymentRequestTokenPayload;

