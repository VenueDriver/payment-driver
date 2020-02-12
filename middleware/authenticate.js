'use strict'
const template = require('../lib/TemplateRenderer')
const Response = require('../lib/Response')
const APIGatewayAuthorizer = require('../lib/APIGatewayAuthorizer')
const CognitoAuthenticator = require('../lib/CognitoAuthenticator')


async function authenticate(event, context) {
  if(process.env.DEBUG){
    console.log("Trying to authenticate") }
  if (global.handler.skipAuthentication) {
    if(process.env.DEBUG){
      console.log("Authenticator Middleware: Skipping authentication."); }
    return;
  }
  // Check for the access token cookie and verify it if it exists.
  var accessToken
  try {
    const authorizer = new APIGatewayAuthorizer()

    accessToken = await authorizer.getValidAccessTokenFromCookie(event)
    console.log("Access token requested...");
  }
  catch (error) {
    console.log("Authenticate error:",error);
    // Respond with login form if there is an error getting the access token.
    return new Response('200').send(
      await template.render('login')
    )
  }
  if (!accessToken) {
    console.log("No access token, redirecting to login");
    // Respond with the login form if the access token is missing,
    // so that the user can provide their authentication credentials and
    // get a token.
    return new Response('200').send(
      await template.render('login')
    )
  }

}

module.exports = authenticate;
