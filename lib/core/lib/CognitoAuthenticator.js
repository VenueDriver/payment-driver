'use strict'
const AWS = require('aws-sdk')
const jwt = require('jsonwebtoken')
const request = require('request')
const requestPromise = require('request-promise')
const jwkToPem = require('jwk-to-pem')

/**
 * Authentication is the process of checking to see if somebody is who they say
 * they are.
 * Contrast this with authorization, the process of checking to see if somebody
 * is allowed to access something.
 *
 * The class in this module implements the server-side flow for AWS Cognito
 * authentication.  This is a modern implementation that uses modern conventions
 * like async / await and Class.  It requires either Node 8.10+, or maybe
 * TypeScript might work if you're using an older Node.  This only uses the
 * AWS SDK, and not Passport or whatever.
 *
 * This code was originally based on the Cognito token verification example code
 * from:
 * https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 * That code has been transformed into a Class that uses async / await for synchronization.
 *
 * @param {String} region The AWS region where your Cognito user pool is located.
 * @param {String} userPoolId The ID of the user pool from the Cognito console.
 * @param {String} clientId The ID of the client from the Cognito user pool.
 */
class CognitoAuthenticator {
  constructor(region, userPoolId, clientId) {
    this.region = region
    this.userPoolId = userPoolId
    this.clientId = clientId
    this.iss = 'https://cognito-idp.' + region + '.amazonaws.com/' + userPoolId
  }

  /**
   * Attempt to authenticate the user with the given parameters.
   * @params parameters A hash containing the user's authentication parameters.
   * @params parameters.username The user's username.
   * @params parameters.password The user's password.
   * @returns {Hash} authResponse, the resonse structure from Cognito, including authResponse.AuthenticationResult.AccessToken a JWT access token from Cognito.
   */
  async authenticate(parameters) {
    var cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' });
    var authResponse
    try {
      authResponse = await cognitoIdentityServiceProvider.adminInitiateAuth({
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        ClientId: this.clientId,
        UserPoolId: this.userPoolId,
        AuthParameters: {
          USERNAME: parameters.username,
          PASSWORD: parameters.password
        }
      }).promise()

      console.log("Authentication success.")
      console.log("Auth response: " + JSON.stringify(authResponse))
    }
    catch (error) {
      console.log("Authentication error: ")
      console.log(error, error.stack);
      throw error
    }

    // Return the entire response structure.
    return authResponse
  }

  /**
   * Respond to an authentication challenge to change the password.
   * @params parameters A hash containing the user's authentication parameters.
   * @params parameters.username The user's username.
   * @params parameters.new_password The user's new password.
   * @returns {String} accessToken a JWT access token from Cognito.
   */
  async respondToAuthChallenge(lastResponse, username, new_password) {
    var cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' });
    console.log("last response (inside): " + JSON.stringify(lastResponse))
    try {
      var challengeResponses = {}

      challengeResponses = {
        USERNAME: username,
        NEW_PASSWORD: new_password
      }

      console.log("Changing password.")
      var challengeResponseResponse = await cognitoIdentityServiceProvider.adminRespondToAuthChallenge({
        ChallengeName: lastResponse.ChallengeName,
        ClientId: this.clientId,
        UserPoolId: this.userPoolId,
        ChallengeResponses: challengeResponses,
        Session: lastResponse.Session
      }).promise()

      console.log("Challenge response success:")
      console.log(JSON.stringify(challengeResponseResponse))
    }
    catch (error) {
      console.log("Challenge response error:")
      console.log(error, error.stack)
    }

    return challengeResponseResponse
  }

  // A Cognito access token is a JWT token, that can be verified using the public
  // keys for the user pool from AWS.  This function handles downloading those
  // keys and making PEMs that can be used to verify a Cognito token.
  async downloadPEM() {
    // Download the JWKs and save it as PEM
    try {
      let body = await requestPromise({
        url: this.iss + '/.well-known/jwks.json',
        json: true
      })

      this.pems = {}

      var keys = body['keys']
      for (var i = 0; i < keys.length; i++) {
        //Convert each key to PEM
        var key_id = keys[i].kid
        var modulus = keys[i].n
        var exponent = keys[i].e
        var key_type = keys[i].kty
        var jwk = { kty: key_type, n: modulus, e: exponent }
        var pem = jwkToPem(jwk)
        this.pems[key_id] = pem
      }
    }
    catch (error) {
      // Unable to download JWKs, fail the call
      console.log("error: " + error)
      return false
    }
  }

  // A Cognito token is a JWT token.  Verifying it means verifying it against the PEMs  from AWS.
  async verifyCognitoToken(token) {
    // Download PEM for your UserPool if not already downloaded.
    if (!this.pems) {
      await this.downloadPEM()
    }

    // PEMs are downloaded, continue with validating the token.
    this.verifyJWTToken(token)
  }

  // A Cognito token is a JWT token.  Verifying it means verifying it against the PEMs
  // that are already downloaded.
  verifyJWTToken(token) {

    // Fail if the token is not a JWT token.
    var decodedJwt = jwt.decode(token, { complete: true })
    if (!decodedJwt) {
      console.log("Not a valid JWT token")
      return false
    }

    // Fail if token is not from the right user pool.
    if (decodedJwt.payload.iss != this.iss) {
      console.log("invalid issuer")
      return false
    }

    // Reject the token if it's not an 'Access Token'.
    if (decodedJwt.payload.token_use != 'access') {
      console.log("Not an access token")
      return false
    }

    // Get the kid from the token and retrieve corresponding PEM.
    var kid = decodedJwt.header.kid
    var pem = this.pems[kid]
    if (!pem) {
      console.log('Invalid access token')
      return false
    }

    //Verify the signature of the JWT token to ensure it's really coming from the user pool.
    console.log("JWT verify.")
    try {
      jwt.verify(token, pem, { issuer: this.iss })
    }
    catch (error) {
      console.log("Error: " + JSON.stringify(error))
      throw error
    }

    console.log('The access token is valid.')
    return true
  }

}

module.exports = CognitoAuthenticator
