const querystring = require('querystring');
const Response = require('../lib/Response');
const PaymentRequest = require('../lib/PaymentRequest.js').PaymentRequest;


async function loadPaymentRequest(event, context) {

  let params;
  if(global.handler.httpMethod == "GET"){
    params = {
      payment_request_id : event['queryStringParameters']['id'],
      payment_request_created_at : event['queryStringParameters']['created_at']
    };
  }else{
    params = querystring.parse(event.body);
  }

  // Look up the payment request record in DynamoDB.
  var paymentRequest;
  try {
    paymentRequest =
      await PaymentRequest.get(
        params.payment_request_id,
        params.payment_request_created_at)
  }
  catch (error) {
    return new Response('200').send(
      await template.render('error', { 'error': error }))
  }

  global.handler.paymentRequest = paymentRequest;

}

module.exports = loadPaymentRequest;
