'use strict'
const fs = require('fs')
const querystring = require('querystring')
const mustache = require('mustache')
const AWS = require('aws-sdk')
const partials = require('./partial-html-templates')
const PaymentRequest = require('./lib/payment-request.js').PaymentRequest
const EmailNotification = require('./lib/email-notification.js').EmailNotification

// The company name from the settings, for the email notifications.
const company = process.env.COMPANY_NAME

// Stripe for payments.
const keyPublishable = process.env.STRIPE_PUBLISHABLE_KEY
const keySecret = process.env.STRIPE_SECRET_KEY
const stripe = require("stripe")(keySecret)

// Send the form.
exports.get = async function (event, context) {

  try {
    var paymentRequest = await PaymentRequest.get(event['queryStringParameters']['id'])

    var templateParameters = paymentRequest
    templateParameters.stripe_publishable_key = keyPublishable
    templateParameters.amount = paymentRequest.amount
    templateParameters.integer_amount = paymentRequest.amount * 100
    templateParameters.description = paymentRequest.description

    var template = fs.readFileSync('templates/payment-form.mustache', 'utf8')
    var html = mustache.render(template, templateParameters, partials())

    return {
      statusCode: 500,
      contentType: 'text/html',
      headers: { 'Content-Type': 'text/html' },
      body: html.toString()
    }
  }
  catch (error) {
    var parameters = { 'error': error }

    var template = fs.readFileSync('templates/error.mustache', 'utf8')
    var html = mustache.render(template, parameters, partials())

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html.toString()
    }
  }
}

// Process a payment.
exports.post = async function (event, context) {
  const params = querystring.parse(event.body)
  var amount = params.amount
  var stripeToken = params.stripeToken

  try {
    var payment = await stripe.charges.create({
      amount: params.amount,
      description: "Sample Charge",
      currency: "usd",
      source: stripeToken
    })

    console.log("Payment, from Stripe:")
    console.log(JSON.stringify(payment))

    try {
      paymentRequest = await PaymentRequest.recordPayment(
        params.payment_request_id, payment)
    }
    // TODO: DRY THIS
    catch (error) {
      var parameters = { 'error': error }

      var template = fs.readFileSync('templates/error.mustache', 'utf8')
      var html = mustache.render(template, parameters, partials())

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      }
    }

    var paymentRequest;
    try {
      paymentRequest = await PaymentRequest.get(params.payment_request_id)
    }
    // TODO: DRY THIS
    catch (error) {
      var parameters = { 'error': error }

      var template = fs.readFileSync('templates/error.mustache', 'utf8')
      var html = mustache.render(template, parameters, partials())

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      }
    }

    var templateParameters = paymentRequest

    // Add 'Origin' from API Gateway so that the email can include a URL
    // back to this same instance of the web app.
    templateParameters.origin = event['headers']['Origin']

    // This notification goes to the customer.
    templateParameters.subject = "Payment to " + company
    templateParameters.to = paymentRequest.email
    var templateName = 'payment-email-to-customer'
    EmailNotification.sendEmail(templateName, templateParameters,
      function (error, data) {
        // If something goes wrong, print an error message.
        if (error) {
          console.log(error.message);
        }
        else {
          console.log("Email sent to customer. Message ID: ", data.MessageId);
        }
      })

    // This notification goes to the requestor.
    templateParameters.subject = "Payment from " + paymentRequest.email
    templateParameters.to = paymentRequest.requestor
    templateName = 'payment-email-to-requestor'
    EmailNotification.sendEmail(templateName, templateParameters,
      function (error, data) {
        // If something goes wrong, print an error message.
        if (error) {
          console.log(error.message);
        }
        else {
          console.log("Email sent to requestor. Message ID: ", data.MessageId);
        }
      })

    var template = fs.readFileSync('templates/payment-confirmation.mustache', 'utf8')
    var html = mustache.render(template, parameters, partials())

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html.toString()
    }
  }
  catch (error) {
    var parameters = { 'error': error.message }

    var template = fs.readFileSync('templates/payment-error.mustache', 'utf8')
    var html = mustache.render(template, parameters, partials())

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html.toString()
    }
  }
}
