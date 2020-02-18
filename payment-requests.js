'use strict'

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

    if(process.env.DEBUG){
      console.log("payment-requests.index"); }
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

        var paymentRequests = await PaymentRequest.index()
        
        //get current date and time to filter payment requests
        var today = new Date();
        var time =  ("0" + today.getHours()).slice(-2) + ':' + ("0" + today.getMinutes()).slice(-2);
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0');
        var yyyy = today.getFullYear();

        today = mm + '/' + dd + '/' + yyyy + ' ' + time; 
        today = new Date(today).getTime();
        
        var expiredPayments = [], soonToExpirePayments = [] , longToExpirePayments = [];

        //adding a day to the current date and time to check for soon to expire payment requests
        var marginDate = new Date(new Date(today).setDate(new Date(today).getDate() + 1)).getTime();

        //filter the payments in three different arrays
        for( var i = 0 ; i < paymentRequests.length ; i++ ){
          var paymentDate = new Date(paymentRequests[i].expiration).getTime();
          paymentRequests[i].created_at_escaped = encodeURIComponent(paymentRequests[i].created_at);
          paymentRequests[i].created_at_moment = moment(paymentRequests[i].created_at).fromNow();

          if( today > paymentDate ){
            expiredPayments.push(JSON.stringify(paymentRequests[i]));
          } else if( today < paymentDate && paymentDate <= marginDate ){
              soonToExpirePayments.push(JSON.stringify(paymentRequests[i]));
          }
          else if ( today < paymentDate && paymentDate > marginDate ){
            longToExpirePayments.push(JSON.stringify(paymentRequests[i]));
          }
        }        

        templateParameters = {
          'soonToExpirePayments': soonToExpirePayments,
          'longToExpirePayments': longToExpirePayments,
          'expiredPayments': expiredPayments
        }
        console.log('dashboard params',templateParameters);
        return new Response('200').send(
          await template.render('payment-requests', templateParameters))
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

    if(process.env.DEBUG){
      console.log("new.templateParameters",templateParameters); }

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
    paymentRequest.total = decimals[0] + "." + decimals[1];

    var templateParameters = paymentRequest

    //Check if the expiration date is valid
    var maxDate = new Date(paymentRequest.event_open).toISOString();
    var formDate = new Date(paymentRequest.expiration);

    //If the expiration date is greater than the event date/time, it will render
    //the rejected payment request template and THEN redirect the user back 
    //to the form.
    if(formDate > maxDate){
      try{
        templateParameters.queryParams = global.handler.queryParams;
        return new Response('200').send(
          await template.render('payment-request-rejected', templateParameters))
      } catch(error){
        return new Response('200').send(
          await template.render('error', { 'error': error }))
      }
    } else {
      try {
        await PaymentRequest.put(paymentRequest)
        
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
