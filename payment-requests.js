'use strict';
const fs = require('fs')
const querystring = require('querystring')
const uuidv1 = require('uuid/v1')
const mustache = require('mustache')
const moment = require('moment')
const AWS = require('aws-sdk')
require('dotenv').load();
const partials = require('./partial-html-templates')
const PaymentRequest = require('./lib/payment-request.js').PaymentRequest
const PaymentRequestEmail = require('./lib/payment-request-email.js').PaymentRequestEmail

exports.index = async function (event, context) {
  try {
    var paymentRequests = await PaymentRequest.index()

    var templateParameters = {
      'paymentRequests': paymentRequests,
      "created_at_moment": function () {
        return moment(this.created_at).fromNow()
      }
    }

    var template = fs.readFileSync('templates/payment-requests.mustache', 'utf8')
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

    // Add 'Origin' from API Gateway so that the email can include a URL
    // back to this same instance of the web app.
    var templateParameters = Object.assign(paymentRequest, {
      'origin': event['headers']['Origin']
    })

    PaymentRequestEmail.sendEmail(templateParameters, function (error, data) {
      // If something goes wrong, print an error message.
      if (error) {
        console.log(error.message);
      }
      else {
        console.log("Email sent! Message ID: ", data.MessageId);
      }
    })

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

    var template = fs.readFileSync('templates/payment-request-error.mustache', 'utf8')
    var html = mustache.render(template, parameters, partials())

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html.toString()
    }
  }
}
