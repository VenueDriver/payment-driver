'use strict'
var fs = require('fs')
var querystring = require('querystring')
var mustache = require('mustache')
const AWS = require('aws-sdk')
require('./partial-html-templates')

// DynamoDB
// TODO: DRY this.
var dynamoConfig = {
  region: process.env.AWS_REGION,
  maxRetries: 1
}
if (process.env.AWS_SAM_LOCAL) dynamoConfig['endpoint'] = "http://dynamodb:8000"
if (process.env.DYNAMODB_ENDPOINT) dynamoConfig['endpoint'] = process.env.DYNAMODB_ENDPOINT
const paymentRequestsTableName = process.env.PAYMENT_REQUESTS_TABLE_NAME

// Stripe for payments.
const keyPublishable = process.env.STRIPE_PUBLISHABLE_KEY
const keySecret = process.env.STRIPE_SECRET_KEY
const stripe = require("stripe")(keySecret)

// Send the form.
exports.get = function (event, context, callback) {

  const dynamo = new AWS.DynamoDB.DocumentClient(dynamoConfig)
  var payment_request_id = event['queryStringParameters']['id']
  dynamo.get({
    TableName: paymentRequestsTableName,
    Key: { 'id': payment_request_id }
  }, function (error, data) {
    if (error) {
      var parameters = { 'error': error }

      var template = fs.readFileSync('templates/error.mustache', 'utf8')
      var html = mustache.render(template, parameters, partials())

      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      }
      callback(null, response)
    }
    else {
      var payment_request = {
        'stripe_publishable_key': keyPublishable,
        'amount': data.Item.amount,
        'stripe_amount': data.Item.amount * 100
      }

      var template = fs.readFileSync('templates/payment-form.mustache', 'utf8')
      var html = mustache.render(template, payment_request, partials())

      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      }
      callback(null, response)

    }
  })
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
      var html = fs.readFileSync('templates/payment-confirmation.mustache', 'utf8')

      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      }
      callback(null, response)
    })
    .catch((error) => { // Error response
      var parameters = { 'error': error.message }

      var template = fs.readFileSync('templates/payment-error.mustache', 'utf8')
      var html = mustache.render(template, parameters, partials())

      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      }
      callback(null, response)
    })
}
