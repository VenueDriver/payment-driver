'use strict'
// const fs = require('fs')
// const template = require('./lib/TemplateRenderer')
// const Response = require('./lib/Response')
// const BaseHandler = require('./lib/BaseHandler')
// const querystring = require('querystring')
// const mustache = require('mustache')
// const moment = require('moment')
// const AWS = require('aws-sdk')
// const PaymentRequest = require('./lib/PaymentRequest.js').PaymentRequest
// const EmailNotification = require('./lib/SESEmailNotification.js').SESEmailNotification
// const BigNumber = require('bignumber.js');
// const Hook      = require('./lib/Hook')
// const Logger = require('./lib/Logger/log')
//
//
//
// const setCustomerFacing = require('./middleware/customer-endpoint');
// const loadPaymentRequest = require('./middleware/load-existing-payment-request');
// const rejectIfPaid = require('./middleware/reject-if-paid');
// const rejectIfExpired = require('./middleware/reject-if-expired');
//
// const FormTemplateValidator = require('./lib/FormTemplateValidator');
// const FormTemplate = FormTemplateValidator.FormTemplate;
// const validator = new FormTemplateValidator();
//
//
// // The company name from the settings, for the email notifications.
// const company = process.env.COMPANY_NAME

/*
  ==============================================================
  ✋ payments.js
  ==============================================================
*/
const ProcessPaymentHandler = require('handler/ProcessPaymentHandler')
const PaymentFormHandler = require('handler/PaymentFormHandler')


// * ====================================== *
// * EXPORTS
// * ====================================== *

exports.get   = PaymentFormHandler.do
exports.post  = ProcessPaymentHandler.do
