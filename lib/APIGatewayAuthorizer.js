'use strict'
const AWS = require('aws-sdk')
const jwt = require('jsonwebtoken')
const request = require('request')
const requestPromise = require('request-promise')
const jwkToPem = require('jwk-to-pem')


const CognitoAuthenticator = require('./CognitoAuthenticator.js')
const userPoolId = process.env.USER_POOL_ID
const region = process.env.AWS_REGION
const clientId = process.env.CLIENT_ID
const authenticator = new CognitoAuthenticator(region, userPoolId, clientId)

/**
 * Authorization is the process of checking to see if somebody is allowed to
 * access something.
 * Contrast this with authorization, is the process of checking to see if
 * somebody is who they say they are.
 *
 * The class in this module connects the functionality in the CognitoAuthenticator.js
 * class with AWS API Gateway events.  This is intended to be used in a Lambda
 * function.  Use this if you want to store your access tokens from Cognito
 * from the CognitoAuthenticator.js
 * This does not require
 * Express.js.
 *
 * This code was originally based on the Cognito token verification example code
 * from:
 * https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 * That code has been transformed into a Class that uses async / await for synchronization.
 */
class APIGatewayAuthorizer {
  /**
   * Check the HTTP headers in an event from API Gateway for a valid access
   * token.
   * @params {Object} An AWS API Gateway event, as seen by a Lambda function.
   * @returns {String} A JWT access token from Cognito, or nothing if the user
   * is not logged in.
   */
  async getValidAccessTokenFromCookie(event) {
    console.log("Looking for access token...")
    const accessToken = this.getAccessTokenCookie(event)

    if (accessToken) {
      console.log("Verifying access token from cookie: " + accessToken)
      await authenticator.verifyCognitoToken(accessToken)

      return accessToken
    }
  }

  /**
   * Get the "access_token" cookie from the HTTP headers in the API Gateway event.
   * @param {Object} event An event from API Gateway that was a parameter to an AWS Lambda function.
   * @returns {String} The value of the "access_token" cookie if it exists, and nothing if not.
   */
  getAccessTokenCookie(event) {
    const cookies = event.headers.Cookie ? event.headers.Cookie.split('; ') : [];
    for (var i in cookies) {
      const cookie = cookies[i].split('=')
      if (cookie[0] == 'access_token') {
        return cookie[1]
      }
    }
  }

}

module.exports = APIGatewayAuthorizer
