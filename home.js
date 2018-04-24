'use strict'
const fs = require('fs')
const querystring = require('querystring')
const uuidv1 = require('uuid/v1')
const mustache = require('mustache')
const moment = require('moment')
require('dotenv').load()
const partials = require('./partial-html-templates')
const PaymentRequest = require('./lib/PaymentRequest.js').PaymentRequest
const EmailNotification = require('./lib/SESEmailNotification.js').SESEmailNotification
const APIGatewayAuthorizer = require('./lib/APIGatewayAuthorizer.js')

// The company name from the settings, for the email notifications.
const company = process.env.COMPANY_NAME

const CognitoAuthenticator = require('./lib/CognitoAuthenticator.js')
const userPoolId = process.env.USER_POOL_ID
const region = process.env.REGION
const clientId = process.env.CLIENT_ID
const authenticator = new CognitoAuthenticator(region, userPoolId, clientId)
const authorizer = new APIGatewayAuthorizer()

exports.index = async function (event, context) {

  // Check for the access token cookie and verify it if it exists.
  var accessToken
  try {
    accessToken = await authorizer.getValidAccessTokenFromCookie(event)
  }
  catch (error) {
    // Check for new-password
    console.log("NEW PASSWORD FORM")
    return;
  }

  if (!accessToken) {
    // Respond with the login form so that the user can provide their
    // authentication credentials.
    return loginFormResponse(event)
  }

  return redirectToPaymentRequestsResponse()
}

exports.login = async function (event, context) {
  const params = querystring.parse(event.body)

  try {
    var accessToken = await authenticator.authenticate({
      username: params.username,
      password: params.password
    })

    console.log("Successful Authentication.")
    console.log("Verifying access token: " + accessToken)
    await authenticator.verifyCognitoToken(accessToken)
  }
  catch (error) {
    // if (authResponse.ChallengeName == 'NEW_PASSWORD_REQUIRED') {
    //   try {
    //     var challengeResponses = {}

    //     console.log("Changing password.")
    //     challengeResponses = {
    //       USERNAME: authResponse.ChallengeParameters.USER_ID_FOR_SRP,
    //       NEW_PASSWORD: 'Paytest008!'
    //     }

    //     var challengeResponseResponse = await cognitoIdentityServiceProvider.adminRespondToAuthChallenge({
    //       ChallengeName: authResponse.ChallengeName,
    //       ClientId: '2b9n452rcn41c8a11qrqfkkv78',
    //       UserPoolId: 'us-east-1_1HqV6hXBb',
    //       ChallengeResponses: challengeResponses,
    //       Session: authResponse.Session
    //     }).promise()

    //     console.log("Challenge response success:")
    //     console.log(JSON.stringify(challengeResponseResponse))
    //   }
    //   catch (error) {
    //     console.log("Challenge response error:")
    //     console.log(error, error.stack);
    //   }

    //   accessToken = challengeResponseResponse.AuthenticationResult.AccessToken
    // }
    // else {
    //   accessToken = authResponse.AuthenticationResult.AccessToken
    // }

    return loginFormResponse(event, "Invalid login.  Please try again.")
  }

  return redirectToPaymentRequestsResponse(accessToken)
}

exports.logout = async function (event, context) {
  return {
    statusCode: 302,
    headers: {
      location: '/',
      // Remove the access token cookie.
      'Set-Cookie': 'access_token=; Expires=Mon, 30 Apr 2012 22:00:00 EDT'
    }
  }
}

function loginFormResponse(event, message) {
  // Respond with the login form so that the user can provide their
  // authentication credentials.
  var templateParameters = {
    'assets_host': '//' + event.headers.Host + ':8081'
  }
  if (message) {
    templateParameters.message = message
  }
  var template = fs.readFileSync('templates/login.mustache', 'utf8')
  var html = mustache.render(template, templateParameters, partials())

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html.toString()
  }
}

function redirectToPaymentRequestsResponse(accessToken) {
  var headers = { location: '/payment-requests' }
  if (accessToken) {
    // This is a session cookie, since it has no expiration set.
    headers['Set-Cookie'] =
      'access_token = ' + accessToken + "; Secure; SameSite=Strict"
  }
  return {
    statusCode: 302,
    headers: headers
  }
}
