'use strict'
/*
  ==============================================================
  ✋ handler/PaymentFormHandler.js
  ==============================================================
*/
const moment = require('moment')

const BaseHandler           = require('../lib/BaseHandler')
const Response              = require('../lib/Response')
const Logger                = require('../lib/Logger/log')
const template = require('../lib/TemplateRenderer')

// MIDDLEWARES
const setCustomerFacing = require('../middleware/customer-endpoint');
const loadPaymentRequest = require('../middleware/load-existing-payment-request');
const rejectIfPaid = require('../middleware/reject-if-paid');
const rejectIfExpired = require('../middleware/reject-if-expired');

// Send the form.
let PaymentFormHandler = new BaseHandler("get").willDo(
  async function (event, context) {
    try {
      var paymentRequest = global.handler.paymentRequest;

      var templateParameters = paymentRequest
      templateParameters.assets_host =
        process.env.ASSETS_HOST ||
          '//' + (event.headers.Host.replace(/\:\d+$/g, '') + ':8081')
      templateParameters.stripe_publishable_key =
        process.env.STRIPE_PUBLISHABLE_KEY
      templateParameters.amount = paymentRequest.amount
      templateParameters.description = paymentRequest.description
      templateParameters.paid_at_moment = function () {
        return moment(this.paid_at).fromNow()
      }

      // Stripe only accepts payment amounts as integers.
      // You can't simply mulitply the amount by 100 because it's a floating-point number.
      // Example: Try entering the expression "32.12 * 100" into the Node REPL.
      // You will get: 32.12 * 100 = 3211.9999999999995
      // templateParameters.integer_amount =
      // The solution is to use fixed-point arithmetic.
      // (new BigNumber(32.12)).times(100).toString()

      let routes = await template.getRoutes();
      templateParameters.additional_fields_partial = "";
      if(
        templateParameters.additional_fields &&
        templateParameters.additional_fields != "none"
        && routes.forms.partials[templateParameters.additional_fields]
      ){
        templateParameters.additional_fields_partial = await template.renderPartial("forms/"+templateParameters.additional_fields,templateParameters);
      }



      return new Response('200').send(
        await template.render('payment-form', templateParameters))
    }
    catch (error) {
      Logger.error(['Error in payment get handler: ',error]);
      return new Response('200').send(
        await template.render('error', { 'error': error }))
    }
  }
)

PaymentFormHandler.middleware([
  setCustomerFacing,
  loadPaymentRequest,
  rejectIfPaid,
  rejectIfExpired
]);

module.exports = PaymentFormHandler
