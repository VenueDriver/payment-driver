'use strict'
const fs = require('fs')
const querystring = require('querystring')
const uuidv1 = require('uuid/v1')
const mustache = require('mustache')
const moment = require('moment')
const AWS = require('aws-sdk')
require('dotenv').load()
// var passport = require('passport')
const partials = require('./partial-html-templates')
const PaymentRequest = require('./lib/payment-request.js').PaymentRequest
const EmailNotification = require('./lib/email-notification.js').EmailNotification

// The company name from the settings, for the email notifications.
const company = process.env.COMPANY_NAME

exports.index = async function (event, context) {

  console.log('SDK Version is ' + AWS.VERSION)

  var templateParamemters = {
    'assets_host': '//' + event.headers.Host + ':8181'
  }
  var template = fs.readFileSync('templates/home.mustache', 'utf8')
  var html = mustache.render(template, templateParamemters, partials())

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html.toString()
  }
}
