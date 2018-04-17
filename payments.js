'use strict'
const fs = require('fs')
const querystring = require('querystring')
const mustache = require('mustache')
const moment = require('moment')
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
    templateParameters.paid_at_moment = function () {
      return moment(this.paid_at).fromNow()
    }

    var template = fs.readFileSync('templates/payment-form.mustache', 'utf8')
    var html = mustache.render(template, templateParameters, partials())

    return {
      statusCode: 200,
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

  // Look up the payment request record in DynamoDB.
  var paymentRequest;
  try {
    paymentRequest = await PaymentRequest.get(params.payment_request_id)
  }
  // TODO: DRY THIS
  catch (error) {
    var templateParameters = { 'error': error }

    var template = fs.readFileSync('templates/error.mustache', 'utf8')
    var html = mustache.render(template, templateParameters, partials())

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html.toString()
    }
  }

  // Create the payment at Stripe.
  var amount = params.amount
  var stripeToken = params.stripeToken

  try {
    var payment = await stripe.charges.create({
      amount: params.amount,
      description: paymentRequest.description,
      metadata: { payment_request_id: paymentRequest.id },
      currency: "usd",
      source: stripeToken
    })

    console.log("Payment, from Stripe:")
    console.log(JSON.stringify(payment))

    var templateParameters = paymentRequest

    // Add 'Origin' from API Gateway so that the email can include a URL
    // back to this same instance of the web app.
    templateParameters.origin = event['headers']['Origin']

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
