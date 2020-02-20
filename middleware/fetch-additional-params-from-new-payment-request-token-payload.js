const MoneySanitizer = require('../lib/money/MoneySanitizer');
const Debugger = require('../lib/Debugger/debug')

function collectNewPaymentRequestParams(payload) {
  const { first: first_name, last: last_name, ...otherAttributes } = payload;
  return { first_name, last_name, ...otherAttributes }
}

function sanitizePaymentRequestParamsValue(values) {
  const { amount, ...otherAttributes } =  values;
  return { ...otherAttributes, amount: MoneySanitizer.sanitize(amount) }
}

async function fetchAdditionalParamsFromNewPaymentRequestTokenPayload(event, context) {
  Debugger.debug(["\nFetchAdditionalParamsFromNewPaymentRequestTokenPayload\n"]);

  if (global.handler.paymentRequestRequestPayload) {
    const payload = global.handler.paymentRequestRequestPayload;
    const paymentRequestParams = collectNewPaymentRequestParams(payload);
    global.handler.newPaymentRequestParams = sanitizePaymentRequestParamsValue(paymentRequestParams);
    Debugger.info(['New payment request params ', global.handler.newPaymentRequestParams]);
    delete global.handler.paymentRequestRequestPayload;
  }

  Debugger.debug(["additional parameters ", global.handler.additionalParams]);
}

module.exports = fetchAdditionalParamsFromNewPaymentRequestTokenPayload;

