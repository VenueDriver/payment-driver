'use strict';
const fs = require('fs')
const querystring = require('querystring')
const uuidv1 = require('uuid/v1');
const mustache = require('mustache')
require('./partial-html-templates')

// DynamoDB.
const AWS = require('aws-sdk')
var dynamoConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  maxRetries: 1
}
if (process.env.AWS_SAM_LOCAL) dynamoConfig['endpoint'] = "http://dynamodb:8000"
if (process.env.DYNAMODB_ENDPOINT) dynamoConfig['endpoint'] = process.env.DYNAMODB_ENDPOINT;
const paymentRequestsTableName = process.env.PAYMENT_REQUESTS_TABLE_NAME || 'payment_requests'

exports.get = function (event, context, callback) {
  var template = fs.readFileSync('views/payment-request-form.mustache', 'utf8')
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

      var template = fs.readFileSync('views/payment-request-error.mustache', 'utf8')
      var html = mustache.render(template, parameters, partials())

      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      }
      callback(null, response)
    }
    else {
      var parameters = { 'id': paymentRequest['id'] }

      var template = fs.readFileSync('views/payment-request-confirmation.mustache', 'utf8')
      var html = mustache.render(template, parameters, partials())

      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString()
      }
      callback(null, response)
    }
  });
}
