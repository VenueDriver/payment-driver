const MoneySanitizer = require('../lib/money/MoneySanitizer');
const Logger = require('../lib/Logger/log')

function collectNewPaymentRequestParams(payload) {
  const { first: first_name, last: last_name, ...otherAttributes } = payload;
  return { first_name, last_name, ...otherAttributes }
}

function sanitizePaymentRequestParamsValue(values) {
  const { amount, ...otherAttributes } =  values;
  return { ...otherAttributes, amount: MoneySanitizer.sanitize(amount) }
}

async function fetchAdditionalParamsFromNewPaymentRequestTokenPayload(event, context) {
  Logger.debug(["\nFetchAdditionalParamsFromNewPaymentRequestTokenPayload\n"]);

  if (global.handler.paymentRequestAccessToken) {
    const payload = global.handler.paymentRequestAccessToken;
    const paymentRequestParams = collectNewPaymentRequestParams(payload);
    global.handler.newPaymentRequestParams = sanitizePaymentRequestParamsValue(paymentRequestParams);
    Logger.info(['New payment request params ', global.handler.newPaymentRequestParams]);
    delete global.handler.paymentRequestAccessToken;
  }

  Logger.debug(["additional parameters ", global.handler.additionalParams]);
}

module.exports = fetchAdditionalParamsFromNewPaymentRequestTokenPayload;

