'use strict'
/*
  ==============================================================
  ✋ handler/ProcessPaymentHandler.js
  ==============================================================
*/

const querystring           = require('querystring')

const BaseHandler           = require('../lib/BaseHandler')
const Response              = require('../lib/Response')
const Logger                = require('../lib/Logger/log')
const template              = require('../lib/TemplateRenderer')
const FormTemplateValidator = require('../lib/FormTemplateValidator')
const PaymentRequest        = require('../lib/PaymentRequest.js').PaymentRequest
const Hook                  = require('../lib/Hook')
const EmailNotification     = require('../lib/SESEmailNotification.js').SESEmailNotification

const FormTemplate          = FormTemplateValidator.FormTemplate
const validator             = new FormTemplateValidator()

// MIDDLEWARES
const loadPaymentRequest    = require('../middleware/load-existing-payment-request')
const rejectIfPaid          = require('../middleware/reject-if-paid')

// Process a payment.
const ProcessPaymentHandler = new BaseHandler("post").willDo(
  async function (event, context) {
    const params = querystring.parse(event.body)



    // Look up the payment request record in DynamoDB.
    const paymentRequest = global.handler.paymentRequest;

    Logger.debug(["paymentRequest",paymentRequest]);
    const stripe                = require("stripe")(process.env.STRIPE_SECRET_KEY);
    // Create the payment at Stripe.
    const stripeToken = params.stripeToken
    const metadata = {};

    global.handler.stripeAmount = parseInt( paymentRequest.total.replace(/\./gi,"") )

    // GATHER ADDITIONAL FIELDS
    Logger.debug(["GATHER ADDITIONAL FIELDS"]);
    if(
      paymentRequest.additional_fields
    ){
      let routes = await template.getRoutes();
      Logger.debug(["routes",routes]);
      let fieldsPartials = await template.renderPartial("forms/"+paymentRequest.additional_fields,Object.assign({customer_facing : false},paymentRequest));
      Logger.debug(["fieldsPartials",fieldsPartials]);
      let fieldsModel = new FormTemplate(fieldsPartials);
      Logger.debug(["fieldsModel",fieldsModel]);
      Logger.debug(["fields",fieldsModel.fields]);

      let errors = validator.validate(fieldsModel,params);
      Logger.debug([errors]);
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
      Logger.debug(["Starting stripe payment"]);

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

      await Hook.execute('before-sending-to-stripe');



      paymentRequest.payment = await stripe.charges.create(global.handler.stripePayload);
      Logger.info(["Payment completed"]);

      paymentRequest.params = params;

      await Hook.execute('after-sending-to-stripe');

      if(paymentRequest.payment.status == "succeeded"){
        await Hook.execute('after-successful-payment');
        paymentRequest.paid = true;
        paymentRequest.paid_at = new Date().toISOString()
      }else{
        await Hook.execute('after-unsuccessful-payment');
      }


      try {
        await Hook.execute('before-updating-dynamodb');
        await PaymentRequest.putPayment(paymentRequest);
        await Hook.execute('after-updating-dynamodb');
      }
      catch (error) {
        Logger.error(['Error Before Sending Payment confirmation email',error]);
        return new Response('200').send(
          await template.render('error', { 'error': error }))
      }

      var templateParameters = paymentRequest

      // This notification goes to the customer.
      templateParameters.subject = "Payment to " + process.env.COMPANY_NAME
      templateParameters.to = paymentRequest.email
      var templateName = 'payment-email-to-customer'
      global.handler.emailToCustomerParameters = templateParameters
      await Hook.execute('before-sending-confirmation-email-to-customer')
      await EmailNotification.sendEmail(templateName, global.handler.emailToCustomerParameters)

      // This notification goes to the requestor.
      templateParameters.subject = "Payment from " + paymentRequest.email
      templateParameters.to = paymentRequest.requestor
      templateName = 'payment-email-to-requestor'
      global.handler.emailToRequestorParameters = templateParameters
      await Hook.execute('before-sending-confirmation-email-to-requestor')
      await EmailNotification.sendEmail(templateName, global.handler.emailToRequestorParameters)

      await Hook.execute('after-sending-email-notifications');

      return new Response('200').send(
        await template.render('payment-confirmation', templateParameters))
    }
    catch (error) {
      Logger.error(['Error starting the process of stripe payment: ',error]);
      return new Response('200').send(
        await template.render('error', { 'error': error }))
    }

  }
)


// ADD MIDDLEWARES
ProcessPaymentHandler.middleware([
  loadPaymentRequest,
  rejectIfPaid
])

module.exports = ProcessPaymentHandler
