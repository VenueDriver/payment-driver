'use strict';

const Jwt = require('jsonwebtoken');

var NewPaymentRequestTokenVerifier = function () {};

NewPaymentRequestTokenVerifier.prototype.verify = function (token) {
  try {
    return Jwt.verify(token, process.env.NEW_PAYMENT_REQUEST_JWT_SECRET)
  }
  catch (error) {
    throw new Error(error);
  }
};

exports.NewPaymentRequestTokenVerifier = new NewPaymentRequestTokenVerifier();
