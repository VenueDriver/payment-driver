'use strict'
const fs = require('fs')
const template = require('./lib/TemplateRenderer')
const Response = require('./lib/Response')
const BaseHandler = require('./lib/BaseHandler')
const querystring = require('querystring')
const mustache = require('mustache')
const moment = require('moment')
const AWS = require('aws-sdk')
const PaymentRequest = require('./lib/PaymentRequest.js').PaymentRequest
const EmailNotification = require('./lib/SESEmailNotification.js').SESEmailNotification
const BigNumber = require('bignumber.js');
const Hook      = require('./lib/Hook')


const setCustomerFacing = require('./middleware/customer-endpoint');
const loadPaymentRequest = require('./middleware/load-existing-payment-request');
const rejectIfPaid = require('./middleware/reject-if-paid');
const rejectIfExpired = require('./middleware/reject-if-expired');

const FormTemplateValidator = require('./lib/FormTemplateValidator');
const FormTemplate = FormTemplateValidator.FormTemplate;
const validator = new FormTemplateValidator();


// The company name from the settings, for the email notifications.
const company = process.env.COMPANY_NAME

// Send the form.
let getHandler = new BaseHandler("get").willDo(
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
      return new Response('200').send(
        await template.render('error', { 'error': error }))
    }
  }
)

getHandler.middleware([
  setCustomerFacing,
  loadPaymentRequest,
  rejectIfPaid,
  rejectIfExpired
]);


// Process a payment.
let postHandler = new BaseHandler("post").willDo(
  async function (event, context) {

    const params = querystring.parse(event.body)

    // Look up the payment request record in DynamoDB.
    const paymentRequest = global.handler.paymentRequest;


    console.log("paymentRequest",paymentRequest)


    // Create the payment at Stripe.
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
    const stripeToken = params.stripeToken
    const metadata = {};

    global.handler.stripeAmount = parseInt( paymentRequest.total.replace(/\./gi,"") )





    // GATHER ADDITIONAL FIELDS
    console.log("GATHER ADDITIONAL FIELDS")
    if(
      paymentRequest.additional_fields
    ){
      let routes = await template.getRoutes();
      console.log("routes",routes);
      let fieldsPartials = await template.renderPartial("forms/"+paymentRequest.additional_fields,Object.assign({customer_facing : false},paymentRequest));
      console.log("fieldsPartials",fieldsPartials);
      let fieldsModel = new FormTemplate(fieldsPartials);
      console.log("fieldsModel",fieldsModel);
      console.log("fields",fieldsModel.fields);
      let errors = validator.validate(fieldsModel,params);
      console.log(errors);
      if(errors.length == 0){
        fieldsModel.fields.forEach(field =>{
          let key = field.name;
          if(!field.readonly && params[key]){
            paymentRequest[key] = params[key];
          }
          metadata[key] = paymentRequest[key];
        });
      }else{
        return new Response('200').send(
          await template.render('error', { 'error': errors.join("<br>") }))
      }
    }



    try {
      console.log("Starting stripe payment");

      metadata.payment_request_id = paymentRequest.id;
      metadata.payment_request_created_at = paymentRequest.created_at;
      metadata.account_id = paymentRequest.account;

      global.handler.stripePayload = {
        amount: global.handler.stripeAmount,
        description: paymentRequest.description,
        metadata: metadata,
        currency: "usd",
        source: stripeToken
      };

      Hook.execute('before-sending-to-stripe');



      paymentRequest.payment = await stripe.charges.create(global.handler.stripePayload);
      console.log("Payment completed");

      paymentRequest.params = params;

      Hook.execute('after-sending-to-stripe');

      if(paymentRequest.payment.status == "succeeded"){
        Hook.execute('after-successful-payment');
        paymentRequest.paid = true;
        paymentRequest.paid_at = new Date().toISOString()
      }else{
        Hook.execute('after-unsuccessful-payment');
      }


      try {
        Hook.execute('before-updating-dynamodb');
        await PaymentRequest.putPayment(paymentRequest);
        Hook.execute('after-updating-dynamodb');
      }
      catch (error) {
        return new Response('200').send(
          await template.render('error', { 'error': error }))
      }

      var templateParameters = paymentRequest

      // This notification goes to the customer.
      templateParameters.subject = "Payment to " + company
      templateParameters.to = paymentRequest.email
      var templateName = 'payment-email-to-customer'
      global.handler.emailToCustomerParameters = templateParameters
      Hook.execute('before-sending-confirmation-email-to-customer')
      await EmailNotification.sendEmail(templateName, global.handler.emailToCustomerParameters)

      // This notification goes to the requestor.
      templateParameters.subject = "Payment from " + paymentRequest.email
      templateParameters.to = paymentRequest.requestor
      templateName = 'payment-email-to-requestor'
      global.handler.emailToRequestorParameters = templateParameters
      Hook.execute('before-sending-confirmation-email-to-requestor')
      await EmailNotification.sendEmail(templateName, global.handler.emailToRequestorParameters)

      Hook.execute('after-sending-email-notifications');

      return new Response('200').send(
        await template.render('payment-confirmation', templateParameters))
    }
    catch (error) {
      return new Response('200').send(
        await template.render('error', { 'error': error }))
    }

  }
)

postHandler.middleware([
  loadPaymentRequest,
  rejectIfPaid
]);

// * ====================================== *
// * EXPORTS
// * ====================================== *

exports.get   = getHandler.do
exports.post  = postHandler.do
