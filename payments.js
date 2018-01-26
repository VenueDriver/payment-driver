'use strict'
var fs = require('fs')
var querystring = require('querystring')
var mustache = require('mustache')
require('./partial-html-templates')

// Stripe for payments.
const keyPublishable = process.env.STRIPE_PUBLISHABLE_KEY
const keySecret = process.env.STRIPE_SECRET_KEY
const stripe = require("stripe")(keySecret)

// Send the form.
exports.get = function (event, context, callback) {
  var payment_request = {
    'stripe_publishable_key': keyPublishable,
    'amount': '420'
  }

  var template = fs.readFileSync('views/payment-form.html', 'utf8')
  var html = mustache.render(template, payment_request, partials())

  const response = {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html.toString()
  }
  callback(null, response)
}

// Process a payment.
exports.post = function (event, context, callback) {
  const body = querystring.parse(event.body)
  var amount = body.amount
  var stripeToken = body.stripeToken

  return stripe.charges.create({
      amount: body.amount,
      description: "Sample Charge",
      currency: "usd",
      source: stripeToken
    })
    .then((charge) => { // Success response
      var html = fs.readFileSync('views/payment-confirmation.html', 'utf8')

      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      }
      callback(null, response)
    })
    .catch((error) => { // Error response
      var parameters = { 'error': error.message }

      var template = fs.readFileSync('views/payment-error.html', 'utf8')
      var html = mustache.render(template, parameters, partials())

      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      }
      callback(null, response)
    })
}
