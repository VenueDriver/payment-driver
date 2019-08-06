const Response = require('../lib/Response');
const template = require('../lib/TemplateRenderer')

async function rejectIfExpired(event, context) {

  const paymentRequest = global.handler.paymentRequest;

  if(
    paymentRequest.expiration &&
    new Date(paymentRequest.expiration).getTime() < new Date().getTime()
  ){
    return new Response('200').send(
      await template.render('error', { 'error': 'This payment request is no longer available, please contact support at <a href="mailto:support@hakkasan.com">support@hakkasan.com</a>.' }))
  }

}

module.exports = rejectIfExpired;
