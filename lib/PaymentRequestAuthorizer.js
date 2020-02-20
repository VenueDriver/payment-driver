'use strict';

const Jwt = require('jsonwebtoken');
const Debugger = require('./Debugger/debug')

class PaymentRequestAuthorizer {
  verify(token) {
    try {
      return Jwt.verify(token, process.env.NEW_PAYMENT_REQUEST_JWT_SECRET)
    }
    catch (error) {
      Debugger.printError(['Error in PaymentAuthorizer verify: ',error]);
      // throw new Error(error);
    }
  }

  decode(token) {
    try {
      return Jwt.decode(token, process.env.NEW_PAYMENT_REQUEST_JWT_SECRET)
    }
    catch (error) {
      Debugger.printError(['Error in PaymentAuthorizer decode: ',error]);
      // throw new Error(error);
    }
  }
  

  getValidAccessTokenFromQueryParams(event) {
    return event['queryStringParameters'] && event['queryStringParameters']['payment-request-token'];
  }
}

module.exports = PaymentRequestAuthorizer;
