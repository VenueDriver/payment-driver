'use strict'
const fs = require('fs')
const querystring = require('querystring')
const mustache = require('mustache')
const AWS = require('aws-sdk')
const partials = require('./partial-html-templates')
const PaymentRequest = require('./lib/payment-request.js').PaymentRequest

// Stripe for payments.
const keyPublishable = process.env.STRIPE_PUBLISHABLE_KEY
const keySecret = process.env.STRIPE_SECRET_KEY
const stripe = require("stripe")(keySecret)

// Send the form.
exports.get = async function (event, context) {

  try {
    var paymentRequest = await PaymentRequest.get(event['queryStringParameters']['id'])

    var templateParameters = {
      'stripe_publishable_key': keyPublishable,
      'amount': paymentRequest.amount,
      'integer_amount': paymentRequest.amount * 100,
      'description': paymentRequest.description,
    }

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
  const body = querystring.parse(event.body)
  var amount = body.amount
  var stripeToken = body.stripeToken

  try {
    var charge = await stripe.charges.create({
      amount: body.amount,
      description: "Sample Charge",
      currency: "usd",
      source: stripeToken
    })

    console.log("CHARGE:")
    console.log(JSON.stringify(charge))

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
