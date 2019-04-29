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

const FormTemplateValidator = require('./lib/FormTemplateValidator');
const FormTemplate = FormTemplateValidator.FormTemplate;
const validator = new FormTemplateValidator();

// The company name from the settings, for the email notifications.
const company = process.env.COMPANY_NAME

// Send the form.
let getHandler = new BaseHandler("get").willDo(
  async function (event, context) {
    try {
      var paymentRequest =
        await PaymentRequest.get(
          event['queryStringParameters']['id'],
          event['queryStringParameters']['created_at'])

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
      templateParameters.integer_amount =
        // The solution is to use fixed-point arithmetic.
        (new BigNumber(32.12)).times(100).toString()

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

// Process a payment.
let postHandler = new BaseHandler("post").willDo(
  async function (event, context) {

    console.log("Post start");
    const params = querystring.parse(event.body)
    console.log("Params:",params);

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

    console.log("paymentRequest",paymentRequest)

    // Create the payment at Stripe.
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
    var amount = params.amount
    var stripeToken = params.stripeToken

    try {
      console.log("Starting stripe payment");
      paymentRequest.payment = await stripe.charges.create({
        amount: params.amount,
        description: paymentRequest.description,
        metadata: {
          payment_request_id: paymentRequest.id,
          payment_request_created_at: paymentRequest.created_at
        },
        currency: "usd",
        source: stripeToken
      })
      console.log("Payment completed");

      paymentRequest.params = params;


      // GATHER ADDITIONAL FIELDS
      console.log("GATHER ADDITIONAL FIELDS")
      if(
        paymentRequest.additional_fields &&
        paymentRequest.additional_fields != "none"
      ){
        let routes = await template.getRoutes();
        console.log("routes",routes);
        let fieldsPartials = await template.renderPartial("forms/"+paymentRequest.additional_fields,paymentRequest);
        console.log("fieldsPartials",fieldsPartials);
        let fieldsModel = new FormTemplate(fieldsPartials);
        console.log("fieldsModel",fieldsModel);
        let errors = validator.validate(fieldsModel,params);
        console.log(errors);
      }



      try {
        await PaymentRequest.putPayment(paymentRequest);
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
      await EmailNotification.sendEmail(templateName, templateParameters)

      // This notification goes to the requestor.
      templateParameters.subject = "Payment from " + paymentRequest.email
      templateParameters.to = paymentRequest.requestor
      templateName = 'payment-email-to-requestor'
      await EmailNotification.sendEmail(templateName, templateParameters)

      return new Response('200').send(
        await template.render('payment-confirmation', templateParameters))
    }
    catch (error) {
      return new Response('200').send(
        await template.render('error', { 'error': error }))
    }

  }
)

// * ====================================== *
// * EXPORTS
// * ====================================== *

exports.get   = getHandler.do
exports.post  = postHandler.do
