'use strict'

console.log("payment-requests.js");
const template = require('./lib/TemplateRenderer')
const Response = require('./lib/Response')
const BaseHandler = require('./lib/BaseHandler')
const querystring = require('querystring')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const AWS = require('aws-sdk')
const PaymentRequest = require('./lib/PaymentRequest.js').PaymentRequest
const EmailNotification = require('./lib/SESEmailNotification.js').SESEmailNotification
const authenticatorMiddleware = require('./middleware/authenticate')
const bypassPaymentRequestAuthenticatorMiddleware = require('./middleware/bypass-payment-request-authenticator')
const bypassNewPaymentRequestAuthenticatorMiddleware = require('./middleware/bypass-new-payment-request-authenticator')
const fetchAdditionalParamsFromNewPaymentRequestTokenPayloadMiddleware = require('./middleware/fetch-additional-params-from-new-payment-request-token-payload')
const Hook      = require('./lib/Hook')

// The company name from the settings, for the email notifications.
const company = process.env.COMPANY_NAME

console.log("Dependencies Ready");

// * ====================================== *
// * HANDLERS
// * ====================================== *



/*
=================================================
 [GET] PAYMENT REQUESTS HANDLER
=================================================
*/

let indexHandler = new BaseHandler("index").willDo(
  async function (event, context) {

    console.log("payment-requests.index");
    var templateParameters

    try {
      // If a payment request ID and created_at time stamp was provided as
      // parameters, then show that payment request instead of the list.
      if (event.queryStringParameters &&
        event.queryStringParameters.id &&
        event.queryStringParameters.created_at) {
        var id = event.queryStringParameters.id
        var created_at = event.queryStringParameters.created_at
        templateParameters = await PaymentRequest.get(id, created_at)
        templateParameters.payment_id = templateParameters.payment.id
        templateParameters.paid_at_moment = function () {
          return moment(this.paid_at).fromNow()
        }

        let routes = await template.getRoutes();
        if(!routes.forms) route.forms = { partials : {} };
        templateParameters.additional_fields_partial = "";
        if(
          templateParameters.additional_fields &&
          templateParameters.additional_fields != "none"
          && routes.forms.partials[templateParameters.additional_fields]
        ){
          templateParameters.additional_fields_partial = await template.renderPartial("forms/"+templateParameters.additional_fields,templateParameters);
        }

        return new Response('200').send(
          await template.render('payment-request', templateParameters))
      }
      else {
        // TODO -- Remove this.
        // Temporarily disabled this page that's outside of our MVP use case
        // because we have a problem with the authentication bypass code that
        // causes this page to be revealed to people following links to
        // status pages for existing payment requests.

        // var paymentRequests = await PaymentRequest.index()

        // templateParameters = {
        //   'paymentRequests': paymentRequests,
        //   'created_at_escaped': function () {
        //     return encodeURIComponent(this.created_at)
        //   },
        //   "created_at_moment": function () {
        //     return moment(this.created_at).fromNow()
        //   }
        // }

        // return new Response('200').send(
        //   await template.render('payment-requests', templateParameters))
      }
    }
    catch (error) {
      return new Response('200').send(
        await template.render('error', { 'error': error }))
    }
  }
)

indexHandler.middleware([
  bypassPaymentRequestAuthenticatorMiddleware,
  authenticatorMiddleware]);

/*
=================================================
 [GET] NEW PAYMENT REQUEST HANDLER
=================================================
*/

let newHandler = new BaseHandler("new").willDo(
  async function (event, context) {
    console.log("\nNew Handler\n");
    let routes = await template.getRoutes();
    if(!routes.forms) route.forms = { partials : {} };
    let fields = Object.keys(routes.forms.partials)
      .map( k => ({
        value : k,
        label : k.replace('fields-','').replace(/\-/gi,' ')
      }) );

    let templateParameters = {};

    if (global.handler.newPaymentRequestParams && Object.keys(global.handler.newPaymentRequestParams).length) {
      templateParameters = global.handler.newPaymentRequestParams;
      delete global.handler.newPaymentRequestParams;
    }

    if (global.handler.queryParams) {
      templateParameters['queryParams'] = global.handler.queryParams;
    }

    for(let i = 0; i < fields.length; i++){
      fields[i].partial = await template.renderPartial("forms/"+fields[i].value, templateParameters)
    }


    templateParameters = { ...templateParameters, fields };

    console.log("new.templateParameters",templateParameters);

    return new Response('200').send(
      await template.render('payment-request-form',templateParameters))
  }
)

newHandler.middleware([
  bypassNewPaymentRequestAuthenticatorMiddleware,
  fetchAdditionalParamsFromNewPaymentRequestTokenPayloadMiddleware,
  authenticatorMiddleware
]);

/*
=================================================
 [POST] NEW PAYMENT REQUEST HANDLER
=================================================
*/


let postHandler = new BaseHandler("Post Payment Request").willDo(
  async function (event, context) {

    // Create the payment request record
    var paymentRequest = querystring.parse(event.body)
    paymentRequest['id'] = uuidv1()

    // SANITIZE AMOUNT
    if(!paymentRequest.total) paymentRequest.total = paymentRequest.amount;
    var decimals = paymentRequest.total.split('.');
    if(decimals.length < 2) decimals.push("00");
    if(decimals[1].length == 0) decimals[1] = "00";
    if(decimals[1].length == 1) decimals[1] = decimals[1] + "0";
    if(decimals[1].length > 2) decimals[1] = decimals[1].substring(0,2);
    paymentRequest.total = decimals[0] + "." + decimals[1];

    try {
      await PaymentRequest.put(paymentRequest)
      var templateParameters = paymentRequest

      // This notification goes to the customer.
      templateParameters.subject = "Payment request from " + company
      templateParameters.to = paymentRequest.email
      var templateName = 'payment-request-email-to-customer'
      global.handler.emailToCustomerParameters = templateParameters
      await Hook.execute('before-sending-request-email-to-customer')
      await EmailNotification.sendEmail(templateName, global.handler.emailToCustomerParameters)

      // This notification goes to the requestor.
      templateParameters.subject = "Payment request to " + paymentRequest.email
      templateParameters.to = paymentRequest.requestor
      templateName = 'payment-request-email-to-requestor'
      global.handler.emailToRequestorParameters = templateParameters
      await Hook.execute('before-sending-request-email-to-requestor')
      await EmailNotification.sendEmail(templateName, global.handler.emailToRequestorParameters)

      return new Response('200').send(
        await template.render('payment-request-confirmation', templateParameters))
    }
    catch (error) {
      return new Response('200').send(
        await template.render('error', { 'error': error }))
    }
  }
)
postHandler.middleware([
  bypassNewPaymentRequestAuthenticatorMiddleware,
  authenticatorMiddleware
]);


/*
=================================================
 [GET] RESEND PAYMENT REQUEST HANDLER
=================================================
*/


let resendHandler = new BaseHandler("resend").willDo(
  async function (event, context) {
    try {
      var paymentRequest =
        await PaymentRequest.get(
          event.queryStringParameters.id,
          event.queryStringParameters.created_at)
      var templateParameters = paymentRequest

      // This notification goes to the customer.
      templateParameters.subject = "Payment request from " + company
      templateParameters.to = paymentRequest.email
      var templateName = 'payment-request-email-to-customer'
      await EmailNotification.sendEmail(templateName, templateParameters)

      return new Response('200').send(
        await template.render('payment-request-resent', templateParameters))
    }
    catch (error) {
      return new Response('200').send(
        await template.render('error', { 'error': error }))
    }
  }
)

resendHandler.middleware(authenticatorMiddleware);


// * ====================================== *
// * EXPORTS
// * ====================================== *

exports.index  = indexHandler.do
exports.new    = newHandler.do
exports.post   = postHandler.do
exports.resend = resendHandler.do
