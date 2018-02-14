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
const dynamo = new AWS.DynamoDB.DocumentClient(dynamoConfig)
const paymentRequestsTableName = process.env.PAYMENT_REQUESTS_TABLE_NAME

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

  // Create the payment request record
  var paymentRequest = querystring.parse(event.body)
  paymentRequest['id'] = uuidv1()

  dynamo.put({
    TableName: paymentRequestsTableName,
    Item: paymentRequest
  }, function (error, data) {
    if (error) {
      var errorString = "Unable to add item. Error JSON:" +
        JSON.stringify(error, null, 2)
      console.error(errorString);
      const response = {
        statusCode: 500,
        headers: { 'Content-Type': 'text/html' },
        body: errorString
      }
      callback(null, response)
    }
    else {
      var successString = "Added item: " +
        JSON.stringify(paymentRequest)
      console.log("data: " + JSON.stringify(data, null, 2));
      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: successString
      }
      callback(null, response)
    }
  });
}
