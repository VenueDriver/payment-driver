'use strict'
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
