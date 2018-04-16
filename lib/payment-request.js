'use strict'
var fs = require('fs')
var querystring = require('querystring')
var mustache = require('mustache')
const AWS = require('aws-sdk')

// DynamoDB
var dynamoConfig = {
  region: process.env.AWS_REGION,
  maxRetries: 1
}
if (process.env.AWS_SAM_LOCAL) dynamoConfig['endpoint'] = "http://dynamodb:8000"
if (process.env.DYNAMODB_ENDPOINT) dynamoConfig['endpoint'] = process.env.DYNAMODB_ENDPOINT
const paymentRequestsTableName = process.env.PAYMENT_REQUESTS_TABLE_NAME
const dynamo = new AWS.DynamoDB.DocumentClient(dynamoConfig)

var PaymentRequest = function () {}

PaymentRequest.prototype.index = async function (id) {
  try {
    var data = await dynamo.scan({
      TableName: paymentRequestsTableName,
      Key: { 'id': id }
    }).promise()

    return data.Items
  }
  catch (error) {
    throw new Error(error);
  }
}

PaymentRequest.prototype.get = async function (id) {
  try {
    var data = await dynamo.get({
      TableName: paymentRequestsTableName,
      Key: { 'id': id }
    }).promise()

    return data.Item
  }
  catch (error) {
    throw new Error(error);
  }
}

PaymentRequest.prototype.put = async function (record) {
  // Add created_at timestamp.
  var now = new Date();
  Object.assign(record, { 'created_at': now.toISOString() })

  try {
    var data = await dynamo.put({
      TableName: paymentRequestsTableName,
      Item: record
    }).promise()

    return data.Item
  }
  catch (error) {
    throw new Error(error);
  }
}

exports.PaymentRequest = new PaymentRequest()
