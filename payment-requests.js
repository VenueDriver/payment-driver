'use strict'
const fs = require('fs')
const querystring = require('querystring')
const uuidv1 = require('uuid/v1')
const mustache = require('mustache')
const moment = require('moment')
const AWS = require('aws-sdk')
require('dotenv').load()
const partials = require('./partial-html-templates')
const PaymentRequest = require('./lib/payment-request.js').PaymentRequest
const EmailNotification = require('./lib/email-notification.js').EmailNotification

// The company name from the settings, for the email notifications.
const company = process.env.COMPANY_NAME

exports.index = async function (event, context) {
  var templateParameters
  var template

  try {
    // If a payment request ID was provided as a parameter, then show that
    // payment request instead of the list.
    if (event.queryStringParameters && event.queryStringParameters.id) {
      var id = event.queryStringParameters.id
      templateParameters = await PaymentRequest.get(event['queryStringParameters']['id'])
      console.log("templateParamemters: " + JSON.stringify(templateParameters))
      templateParameters.payment_id = templateParameters.payment.id
      templateParameters.paid_at_moment = function () {
        return moment(this.paid_at).fromNow()
      }

      var template = fs.readFileSync('templates/payment-request.mustache', 'utf8')
    }
    else {
      var paymentRequests = await PaymentRequest.index()

      templateParameters = {
        'paymentRequests': paymentRequests,
        "created_at_moment": function () {
          return moment(this.created_at).fromNow()
        }
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

exports.new = async function (event, context) {
  var template = fs.readFileSync('templates/payment-request-form.mustache', 'utf8')
  var html = mustache.render(template, {}, partials())

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
