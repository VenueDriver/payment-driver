'use strict'
const template = require('./lib/TemplateRenderer')
const Response = require('./lib/Response')
const BaseHandler = require('./lib/BaseHandler')
const querystring = require('querystring')
const urljoin     = require('url-join')
const APIGatewayAuthorizer = require('./lib/APIGatewayAuthorizer.js')
const Debugger = require('./lib/Debugger/debug')


// The company name from the settings, for the email notifications.
const company = process.env.COMPANY_NAME

const CognitoAuthenticator = require('./lib/CognitoAuthenticator.js')
const authenticatorMiddleware = require('./middleware/authenticate');

// * ====================================== *
// * HANDLERS
// * ====================================== *

// Index handler
// This is the home page of the app.
// If you're not authenticated then you will be asked to log in.
// If you're authenticated then you will be redirected to the management UI.
let indexHandler = new BaseHandler("index").willDo(
  async function (event, context) {

    // Redirect to the home of the authenticated management area if the
    // token is detected and valid.
    return new Response('302').redirect('payment-requests')
  }
)


indexHandler.middleware(authenticatorMiddleware);

// Login handler
// If you provide valid credentials but you need to change your password
// according to Cognito, then you will see a form to change your password.
// If you provide valid credentials and you do not need to change your password,
// then you will be redirected to the management UI.
let loginHandler = new BaseHandler("login").willDo(
  async function (event, context) {
    Debugger.info(["Login in"])
    Debugger.info([process.env.AWS_REGION,
    process.env.USER_POOL_ID,
    process.env.CLIENT_ID]);
    const params = querystring.parse(event.body)

    const authenticator =
      new CognitoAuthenticator(
        process.env.AWS_REGION,
        process.env.USER_POOL_ID,
        process.env.CLIENT_ID)
    const authorizer = new APIGatewayAuthorizer()

    var authResponse
    try {
      authResponse = await authenticator.authenticate({
        username: params.username,
        password: params.password
      })

      if (authResponse.ChallengeName == 'NEW_PASSWORD_REQUIRED') {
        if (params.new_password) {
          authResponse =
            await authenticator.respondToAuthChallenge(
              authResponse, params.username, params.new_password)
        }
        else {
          return new Response('200').send(
            await template.render('login', {
              'message': 'Please change your password to proceed.',
              'new_password': true, // Show the 'new password' field.
              'username': params.username,
              'password': params.password
            })
          )
        }
      }

      // Verify access token.
      await authenticator.verifyCognitoToken(
        authResponse.AuthenticationResult.AccessToken)
      // TODO: This should only happen if the token was valid.
      return redirectToPaymentRequestsResponse(event,
        authResponse.AuthenticationResult.AccessToken)
    }
    catch (error) {
      Debugger.printError(['Error in login page',error]);
      return new Response('200').send(
        await template.render('login', {
          'message': error,
          'username': params.username,
          'password': params.password
        })
      )
    }
  }
)


// Logout handler
let logoutHandler = new BaseHandler("logout").willDo(
  async function (event, context) {
    return new Response('302').send({
      headers: {
        location: global.handler.base_url,
        // Remove the access token cookie.
        'Set-Cookie': 'access_token=; Expires=Mon, 30 Apr 2012 22:00:00 EDT'
      }
    })
  }
)


// * ====================================== *
// * FUNCTIONS
// * ====================================== *

function redirectToPaymentRequestsResponse(event, accessToken) {
  return new Response('302').redirect('payment-requests',{
    headers: {
      // Add the authentication token as a cookie.
      'Set-Cookie':
        // This is a session cookie, since it has no expiration set.
        'access_token = ' + accessToken + (
          process.env.STAGE_NAME == 'development' ? "" : "; Secure; SameSite=Strict"
        )
    }
  })
}

// * ====================================== *
// * EXPORTS
// * ====================================== *

exports.index   = indexHandler.do
exports.login   = loginHandler.do
exports.logout  = logoutHandler.do
