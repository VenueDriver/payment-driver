'use strict';
var fs = require('fs');
var querystring = require('querystring');
var mustache = require('mustache');

// Stripe for payments.
const keyPublishable = process.env.STRIPE_PUBLISHABLE_KEY;
const keySecret = process.env.STRIPE_SECRET_KEY;
const stripe = require("stripe")(keySecret);

// Send the form.
exports.get = function (event, context) {
  var payment_request = {
    'stripe_publishable_key': keyPublishable,
    'amount': '420'
  }

  var template = fs.readFileSync('views/payment-form.html', 'utf8');
  var html = mustache.to_html(template, payment_request);

  context.succeed({
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html.toString()
  });
};

// Process a payment.
exports.post = function (event, context, callback) {
  const body = querystring.parse(event.body);
  var amount = body.amount
  var stripeToken = body.stripeToken

  console.log('stripeToken: ' + stripeToken)

  return stripe.charges.create({
      amount: body.amount,
      description: "Sample Charge",
      currency: "usd",
      source: stripeToken
    })
    .then((charge) => { // Success response
      var html = fs.readFileSync('views/payment-confirmation.html', 'utf8');

      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      };
      callback(null, response);
    })
    .catch((err) => { // Error response
      const response = {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: err.message,
        }),
      };
      callback(null, response);
    })
};
