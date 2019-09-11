'use strict';

const Jwt = require('jsonwebtoken');

class PaymentRequestAuthorizer {
  verify(token) {
    try {
      return Jwt.verify(token, process.env.NEW_PAYMENT_REQUEST_JWT_SECRET)
    }
    catch (error) {
      throw new Error(error);
    }
  }

  getValidAccessTokenFromQueryParams(event) {
    return event['queryStringParameters'] && event['queryStringParameters']['payment-request-token'];
  }
}

module.exports = PaymentRequestAuthorizer;
