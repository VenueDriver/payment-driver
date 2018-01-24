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
  console.log('helo?')
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
exports.post = function (event, context) {
  const body = querystring.parse(event.body);
  var amount = body.amount
  var stripeToken = body.stripeToken

  console.log('stripeToken: ' + stripeToken)

  stripe.charges.create({
      amount: body.amount,
      description: "Sample Charge",
      currency: "usd",
      source: stripeToken
    })
    .then(
      context.fail({
        statusCode: 418,
        headers: { 'Content-Type': 'text/html' },
        body: "I'm a teapot."
      }),
      context.succeed({
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: "SUCCESS!"
      }))
};
