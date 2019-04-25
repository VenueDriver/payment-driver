'use strict'
var fs = require('fs')
var querystring = require('querystring')
var mustache = require('mustache')
const AWS = require('aws-sdk')

var PaymentRequest = function () {}

function dynamoConfig() {
  var config = {
    region: process.env.AWS_REGION,
    maxRetries: 1
  }
  if (process.env.AWS_SAM_LOCAL) config['endpoint'] = "http://dynamodb:8000"
  if (process.env.DYNAMODB_ENDPOINT) config['endpoint'] = process.env.DYNAMODB_ENDPOINT
  return config
}

PaymentRequest.prototype.index = async function (id) {
  const dynamo = new AWS.DynamoDB.DocumentClient(dynamoConfig())

  try {
    var data = await dynamo.scan({
      TableName: process.env.PAYMENT_REQUESTS_TABLE_NAME,
      Key: { 'id': id }
    }).promise()

    // Sort them in mempory.
    // (Since it's so hard to sort them with DynamoDB.)
    return data.Items.sort((a,b)=>{
      let aDate = new Date(a.created_at)
      let bDate = new Date(b.created_at)
      return bDate.getTime() - aDate.getTime()
    })
  }
  catch (error) {
    throw new Error(error);
  }
}

PaymentRequest.prototype.get = async function (id, created_at) {
  const dynamo = new AWS.DynamoDB.DocumentClient(dynamoConfig())
  try {
    var data = await dynamo.get({
      TableName: process.env.PAYMENT_REQUESTS_TABLE_NAME,
      Key: {
        'id': id,
        'created_at': created_at
      }
    }).promise()

    return data.Item
  }
  catch (error) {
    throw new Error(error);
  }
}

PaymentRequest.prototype.put = async function (record) {
  const dynamo = new AWS.DynamoDB.DocumentClient(dynamoConfig())

  // Add created_at timestamp.
  var now = new Date();
  record.created_at = now.toISOString()
  record.updated_at = now.toISOString()

  // Everything is simpler if these attributes exist when the record is created.
  // More info: https://forums.aws.amazon.com/thread.jspa?threadID=162907
  record.paid = false
  record.paid_at = '-' // https://forums.aws.amazon.com/thread.jspa?threadID=90137
  record.payment = {}

  try {
    var data = await dynamo.put({
      TableName: process.env.PAYMENT_REQUESTS_TABLE_NAME,
      Item: record
    }).promise()
    return data.Item
  }
  catch (error) {
    throw new Error(error)
  }
}

PaymentRequest.prototype.recordPayment = async function (id, created_at, payment) {
  const dynamo = new AWS.DynamoDB.DocumentClient(dynamoConfig())

  // For the timestamps.
  var now = new Date();

  try {
    var data = await dynamo.update({
      TableName: process.env.PAYMENT_REQUESTS_TABLE_NAME,
      Key: { 'id': id, 'created_at': created_at },
      UpdateExpression: "set paid = :p, paid_at = :u, updated_at=:u, payment=:r",
      ExpressionAttributeValues: {
        ":p": true,
        ":u": now.toISOString(),
        ":r": payment
      },
    }).promise()

    return data.Item
  }
  catch (error) {
    throw new Error(error);
  }
}

exports.PaymentRequest = new PaymentRequest()
