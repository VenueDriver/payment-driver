'use strict'
const template = require('../lib/TemplateRenderer')
const Response = require('../lib/Response')
const APIGatewayAuthorizer = require('../lib/APIGatewayAuthorizer')
const CognitoAuthenticator = require('../lib/CognitoAuthenticator')
const Logger = require('../lib/Logger/log')

async function authenticate(event, context) {
  Logger.debug(["Trying to authenticate"])
  if (global.handler.skipAuthentication) {
    Logger.info(["Authenticator Middleware: Skipping authentication."]);
    return;
  }
  // Check for the access token cookie and verify it if it exists.
  var accessToken
  try {
    const authorizer = new APIGatewayAuthorizer()

    accessToken = await authorizer.getValidAccessTokenFromCookie(event)
    Logger.info(["Access token requested..."]);
  }
  catch (error) {
    Logger.error(["Authenticate error:",error]);
    // Respond with login form if there is an error getting the access token.
    return new Response('200').send(
      await template.render('login')
    )
  }
  if (!accessToken) {
    Logger.info(["No access token, redirecting to login"]);
    // Respond with the login form if the access token is missing,
    // so that the user can provide their authentication credentials and
    // get a token.
    return new Response('200').send(
      await template.render('login')
    )
  }

}

module.exports = authenticate;
