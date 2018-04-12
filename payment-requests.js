'use strict';
const fs = require('fs')
const querystring = require('querystring')
const uuidv1 = require('uuid/v1');
const mustache = require('mustache')
require('dotenv').load();
require('./partial-html-templates')
const PaymentRequestEmail = require('./lib/payment-request-email.js').PaymentRequestEmail;

// DynamoDB
// TODO: DRY this.
var dynamoConfig = {
  region: process.env.AWS_REGION,
  maxRetries: 1
}
if (process.env.AWS_SAM_LOCAL) dynamoConfig['endpoint'] = "http://dynamodb:8000"
if (process.env.DYNAMODB_ENDPOINT) dynamoConfig['endpoint'] = process.env.DYNAMODB_ENDPOINT
const paymentRequestsTableName = process.env.PAYMENT_REQUESTS_TABLE_NAME

exports.get = function (event, context, callback) {
  var template = fs.readFileSync('templates/payment-request-form.mustache', 'utf8')
  var html = mustache.render(template, {}, partials())

  const response = {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html.toString()
  }
  callback(null, response)
};

exports.post = function (event, context, callback) {

  const dynamo = new AWS.DynamoDB.DocumentClient(dynamoConfig)

  // Create the payment request record
  var paymentRequest = querystring.parse(event.body)
  paymentRequest['id'] = uuidv1()

  dynamo.put({
    TableName: paymentRequestsTableName,
    Item: paymentRequest
  }, function (error, data) {
    if (error) {
      var parameters = { 'error': error }

      var template = fs.readFileSync('templates/payment-request-error.mustache', 'utf8')
      var html = mustache.render(template, parameters, partials())

      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      }
      callback(null, response)
    }
    else {

      // Add 'Origin' from API Gateway so that the email can include a URL
      // back to this same instance of the web app.
      var paymentRequestParameters = Object.assign(paymentRequest, {
        'origin': event['headers']['Origin']
      })

      PaymentRequestEmail.sendEmail(paymentRequestParameters, function (error, data) {
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

      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      }
      callback(null, response)
    }
  });
}
