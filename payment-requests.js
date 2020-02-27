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
const Logger = require('./lib/Logger/log')
const validExpirationDate = require('./lib/ExpirationValidator/validate-expiration')

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

    Logger.debug(["payment-requests.index"]);
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

        templateParameters.isUserAuthenticated = global.handler.authenticated;

        return new Response('200').send(
          await template.render('payment-request', templateParameters))
      }
      else {
        // TODO -- Remove this.
        // Temporarily disabled this page that's outside of our MVP use case
        // because we have a problem with the authentication bypass code that
        // causes this page to be revealed to people following links to
        // status pages for existing payment requests.

        var paymentRequests = await PaymentRequest.index();

        //set default quantity and page number for the pagination of the 
        //payment requests
        var quantity = (event.queryStringParameters && event.queryStringParameters.quantity) ? event.queryStringParameters.quantity : 5;
        var expiredIndex = (event.queryStringParameters && event.queryStringParameters.expiredIndex) ? event.queryStringParameters.expiredIndex : 1;
        var longIndex = (event.queryStringParameters && event.queryStringParameters.longIndex) ? event.queryStringParameters.longIndex : 1;
        var soonIndex = (event.queryStringParameters && event.queryStringParameters.soonIndex) ? event.queryStringParameters.soonIndex : 1;

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
            expiredPayments.push(paymentRequests[i]);

          } else if( today < paymentDate && paymentDate <= marginDate ){
              soonToExpirePayments.push(paymentRequests[i]);
          }
          else if ( today < paymentDate && paymentDate > marginDate ){
            longToExpirePayments.push(paymentRequests[i]);
          }
        }  


        if(event.queryStringParameters && event.queryStringParameters.email){
          expiredPayments = filterPayments(expiredPayments , event.queryStringParameters.email);
          soonToExpirePayments = filterPayments(soonToExpirePayments , event.queryStringParameters.email);
          longToExpirePayments = filterPayments(longToExpirePayments , event.queryStringParameters.email);
        }

        var expiredPages = calculateMax(expiredPayments,quantity);
        var longPages = calculateMax(longToExpirePayments,quantity);
        var soonPages = calculateMax(soonToExpirePayments,quantity);
        
        
        expiredPayments = returnArrayPortion(expiredIndex, expiredPayments , quantity );
        soonToExpirePayments = returnArrayPortion(soonIndex, soonToExpirePayments , quantity );
        longToExpirePayments = returnArrayPortion(longIndex, longToExpirePayments , quantity );

        expiredPayments = expiredPayments.map(function(obj){
          return JSON.stringify(obj);
        });
        soonToExpirePayments = soonToExpirePayments.map(function(obj){
          return JSON.stringify(obj);
        });
        longToExpirePayments = longToExpirePayments.map(function(obj){
          return JSON.stringify(obj);
        });

        templateParameters = {
          'soonToExpirePayments': soonToExpirePayments,
          'longToExpirePayments': longToExpirePayments,
          'expiredPayments': expiredPayments,
          'expiredPages': expiredPages,
          'longPages': longPages,
          'soonPages': soonPages
        }
        // Logger.info(['dashboard params',templateParameters]);
        if(event.queryStringParameters && event.queryStringParameters.data){
          Logger.info(['Data succesfully returned'],templateParameters);
          return new Response('200').send(JSON.stringify(templateParameters));
        } else {
          Logger.info(['Index succesfully rendered with this data: '],templateParameters);
          return new Response('200').send(
            await template.render('payment-requests', templateParameters));
        } 
      }
    }
    catch (error) {
      Logger.error(['Error in index handler: ',error]);
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

    Logger.debug(["new.templateParameters",templateParameters]);

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

    if(!validExpirationDate(paymentRequest)){
      try{
        templateParameters.queryParams = global.handler.queryParams;
        return new Response('200').send(
          await template.render('payment-request-rejected', templateParameters))
      } catch(error){
        Logger.error(['Error in redirecting user to previous form: ',error]);
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
        Logger.error(['Error sending payment request emails: ',error]);
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
      Logger.error(['Error resending payment request: ',error]);
      return new Response('200').send(
        await template.render('error', { 'error': error }))
    }
  }
)

resendHandler.middleware(authenticatorMiddleware);



/*
=================================================
 [GET] EDIT PAYMENT REQUEST HANDLER
=================================================
*/


let editHandler = new BaseHandler("Edit Request").willDo(
  async function (event, context) {
    try {
      var paymentRequest =
        await PaymentRequest.get(
          event.queryStringParameters.id,
          event.queryStringParameters.created_at)
      var templateParameters = paymentRequest

      return new Response('200').send(
        await template.render('payment-request-edit', templateParameters))
    }
    catch (error) {
      Logger.error(['error in edit get handler', error]);
      return new Response('200').send(
        await template.render('error', { 'error': error }))
    }
  }
)

editHandler.middleware(authenticatorMiddleware);


/*
=================================================
 [POST] EDIT PAYMENT REQUEST HANDLER
=================================================
*/


let postEditHandler = new BaseHandler("Post Edit Request").willDo(
  async function (event, context) {
    var paymentNewData = querystring.parse(event.body);

    try {
      var paymentRequest =
        await PaymentRequest.get(
          event.queryStringParameters.id,
          event.queryStringParameters.created_at)

      if(paymentNewData.expiration){
        paymentRequest.expiration = paymentNewData.expiration;
      }

      if(!validExpirationDate(paymentRequest)){
        Logger.error(['error in edit post handler, the date of the form was older than the event open date/time']);
        return new Response('200').send(
          await template.render('error', { 'error': 'The expiration date is older than the event open date/time.' }))
      } else {
        await PaymentRequest.upsertRecord(paymentRequest);
        return new Response('302').redirect('payment-requests-resend?id='+event.queryStringParameters.id+'&created_at='+event.queryStringParameters.created_at);
      }
    }
    catch (error) {
      Logger.error(['error in post handler try catch',error]);
      return new Response('200').send(
        await template.render('error', { 'error': error }))
    }
  }
)

postEditHandler.middleware(authenticatorMiddleware);


//complementary functions

function returnArrayPortion(index, data , quantity ){
  var resultingData = [];
  
  if( index === 1){
    var diffIndex = 0;
  } else {
    var diffIndex = index - 1;
  }

  if(data.length >= (diffIndex*quantity)){
    for( var i = (quantity*diffIndex) ; i < (quantity*index) ; i++){
      if(data[i]){
        resultingData.push(data[i]);
      }
    }
  }
  
  return resultingData;
}

function filterPayments(data , email = null){
  if(data.length > 0 && email){
      data = data.filter( function(obj){
        var result = false;
        if (obj.email && obj.email.includes(email)){
          result = true;
        }
        return result;
      });
  }
  return data;
}

function calculateMax(data,increment){
  return Math.ceil(data.length/increment);
}


// * ====================================== *
// * EXPORTS
// * ====================================== *

exports.index  = indexHandler.do
exports.new    = newHandler.do
exports.post   = postHandler.do
exports.resend = resendHandler.do
exports.edit   = editHandler.do
exports.postEdit = postEditHandler.do
