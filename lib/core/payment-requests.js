'use strict'
const fs = require('fs')
const querystring = require('querystring')
const uuidv1 = require('uuid/v1')
const mustache = require('mustache')
const moment = require('moment')
const AWS = require('aws-sdk')

// Load environment variables and override anything already set.
const dotenv = require('dotenv')
try {
  const envConfig = dotenv.parse(fs.readFileSync('.env'))
  for (var k in envConfig) { process.env[k] = envConfig[k] }
}
catch (err) {
  // There will not be a .env file in production.
}

const partials = require('./partial-html-templates')
const PaymentRequest = require('./lib/PaymentRequest.js').PaymentRequest
const EmailNotification = require('./lib/SESEmailNotification.js').SESEmailNotification

// The company name from the settings, for the email notifications.
const company = process.env.COMPANY_NAME

exports.index = async function (event, context) {
  var templateParameters
  var template

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
      templateParameters.assets_host = process.env.ASSETS_HOST || '//' + (event.headers.Host + ':8081')

      var template = fs.readFileSync('templates/payment-request.mustache', 'utf8')
    }
    else {
      var paymentRequests = await PaymentRequest.index()

      templateParameters = {
        'paymentRequests': paymentRequests,
        'created_at_escaped': function () {
          return encodeURIComponent(this.created_at)
        },
        "created_at_moment": function () {
          return moment(this.created_at).fromNow()
        },
        'assets_host': '//' + event.headers.Host + ':8081'
      }
      template = fs.readFileSync('templates/payment-requests.mustache', 'utf8')
    }

    var html = mustache.render(template, templateParameters, partials())

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html.toString()
    }
  }
  catch (error) {
    var templateParamemters = {
      'assets_host': '//' + event.headers.Host + ':8081',
      'error': error
    }

    var template = fs.readFileSync('templates/error.mustache', 'utf8')
    var html = mustache.render(template, templateParamemters, partials())

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html.toString()
    }
  }
}

exports.new = async function (event, context) {
  var templateParamemters = {
    'assets_host': '//' + event.headers.Host + ':8081'
  }
  var template = fs.readFileSync('templates/payment-request-form.mustache', 'utf8')
  var html = mustache.render(template, templateParamemters, partials())

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html.toString()
  }
}

exports.post = async function (event, context) {

  // Create the payment request record
  var paymentRequest = querystring.parse(event.body)
  paymentRequest['id'] = uuidv1()

  try {
    await PaymentRequest.put(paymentRequest)

    var templateParameters = paymentRequest
    templateParameters.assets_host = process.env.ASSETS_HOST || '//' + (event.headers.Host + ':8081')

    // Add 'Origin' from API Gateway so that the email can include a URL
    // back to this same instance of the web app.
    templateParameters.origin = event['headers']['Origin']
    if (process.env.BASE_URL) {
      templateParameters.base_url = process.env.BASE_URL
    }
    else {
      templateParameters.base_url = templateParameters.origin
    }

    // This notification goes to the customer.
    templateParameters.subject = "Payment request from " + company
    templateParameters.to = paymentRequest.email
    var templateName = 'payment-request-email-to-customer'
    await EmailNotification.sendEmail(templateName, templateParameters)

    // This notification goes to the requestor.
    templateParameters.subject = "Payment request to " + paymentRequest.email
    templateParameters.to = paymentRequest.requestor
    templateName = 'payment-request-email-to-requestor'
    await EmailNotification.sendEmail(templateName, templateParameters)

    var template = fs.readFileSync('templates/payment-request-confirmation.mustache', 'utf8')
    var html = mustache.render(template, paymentRequest, partials())

    return {
      statusCode: 200,
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

exports.resend = async function (event, context) {
  try {
    var paymentRequest = await PaymentRequest.get(event.queryStringParameters.id)
    var templateParameters = paymentRequest
    templateParameters.assets_host = process.env.ASSETS_HOST || '//' + (event.headers.Host + ':8081')

    // Add 'Origin' from API Gateway so that the email can include a URL
    // back to this same instance of the web app.
    templateParameters.origin = event['headers']['Origin']
    if (process.env.BASE_URL) {
      templateParameters.base_url = process.env.BASE_URL
    }
    else {
      templateParameters.base_url = templateParameters.origin
    }

    // This notification goes to the customer.
    templateParameters.subject = "Payment request from " + company
    templateParameters.to = paymentRequest.email
    var templateName = 'payment-request-email-to-customer'
    await EmailNotification.sendEmail(templateName, templateParameters)

    var template = fs.readFileSync('templates/payment-request-resent.mustache', 'utf8')
    var html = mustache.render(template, paymentRequest, partials())

    return {
      statusCode: 200,
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
