const Response = require('../lib/Response');
const template = require('../lib/TemplateRenderer')

async function rejectIfPaid(event, context) {

  const paymentRequest = global.handler.paymentRequest;

  if(paymentRequest.payment && paymentRequest.payment.captured){
    return new Response('200').send(
      await template.render('error', { 'error': 'This payment request is no longer available, please <a href="mailto:support@venuedriver.com">contact support.</a>' }))
  }

  global.handler.customer_facing = true;

}

module.exports = rejectIfPaid;
