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

  getValidAccessTokenFromCookie(event) {
    if (!event.headers.Cookie) {
      return ;
    }

    const cookies = event.headers.Cookie.split('; ');
    for (var i in cookies) {
      const cookie = cookies[i].split('=');
      if (cookie[0] === 'payment_request_token') {
        return cookie[1]
      }
    }
  }

  getAccessTokenWrappedInCookie(token, event) {
    const fiveMinutes = 5 * 60 * 1000;
    const expiration = new Date(new Date().getTime() + fiveMinutes);
    const cookieSecure = event.headers.Host.match(/(localhost|0.0.0.0|127.0.0.1)/) ? '' : 'Secure; SameSite=Strict;';
    return { 'Set-Cookie' : `payment_request_token=${token}; Expires=${expiration}; ${cookieSecure}` };
  }

  getExpiredAccessTokenWrappedInCookie() {
    return { 'Set-Cookie' : 'payment_request_token=; Expires=Mon, 30 Apr 2012 22:00:00 EDT' };
  }
}

module.exports = PaymentRequestAuthorizer;
