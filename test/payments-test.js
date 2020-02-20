var chai = require('chai')
var expect = chai.expect;
const cheerio = require('cheerio')
var AWS = require('aws-sdk-mock')

var nock = require('nock')

var payments = require('../payments');

const stripe = require("stripe")('test');

describe('Payment Driver', function () {

  afterEach(function () {
    AWS.restore()
  })

  describe('payments REST resource', function () {

    it('should send a payment form when the index is requested', async() => {
      AWS.mock('DynamoDB.DocumentClient', 'get', function (params, callback) {
        callback(null, { 'Item': {} })
      })

      const result = await payments.get(
        { 'requestContext': {'httpMethod': 'GET', 'path':''},
          'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'},
          'queryStringParameters': { 'id': '1234' }
        }, {})

      expect(result.statusCode).to.equal(200);
      expect(result.headers['Content-Type']).to.equal('text/html');
      const $ = cheerio.load(result.body)
      expect($('legend').text()).to.have.string('Please provide payment')
    })

    it('should process a payment with Stripe when the payment form is posted', async() => {

      AWS.mock('DynamoDB.DocumentClient', 'get', function (params, callback) {
        callback(null, { 'Item': { 'Key': 1234 } })
      })
      AWS.mock('DynamoDB.DocumentClient', 'update', function (params, callback) {
        callback(null, { 'Item': {} })
      })
      AWS.mock('SES', 'sendEmail', function (params, callback) {
        callback(null, 'Success!')
      })

      nock('https://api.stripe.com/v1')
        .post('/charges')
        .reply(200, { success: true }, []);

      const result = await payments.post(
        { 'requestContext': {'httpMethod': 'POST', 'path':''},
          'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'} }, {})

      expect(result.statusCode).to.equal(200);
      expect(result.headers['Content-Type']).to.equal('text/html');
      const $ = cheerio.load(result.body)
      expect($('H1').text()).to.have.string('Thank you')
      expect($('p.lead').text()).to.have.string('Your payment was processed successfully.')

    })

    it('should return an error when there is an error response from Stripe', async() => {

      AWS.mock('DynamoDB.DocumentClient', 'get', function (params, callback) {
        callback(null, { 'Item': {} })
      })
      AWS.mock('DynamoDB.DocumentClient', 'update', function (params, callback) {
        callback(null, { 'Item': {} })
      })
      AWS.mock('SES', 'sendEmail', function (params, callback) {
        callback(null, 'Success!')
      })

      nock('https://api.stripe.com/v1')
        .post('/charges')
        .reply(400, { "error": { "type": "invalid_request_error", "message": "Test error message." } }, []);

      const result = await payments.post({ 'requestContext': {'httpMethod': 'POST', 'path':''},
        'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'} }, {})

      expect(result.statusCode).to.equal(200);
      expect(result.headers['Content-Type']).to.equal('text/html');

      const $ = cheerio.load(result.body)
      expect($('H1').text()).to.have.string('Error')
      expect($('p.lead').text()).to.have.string('There was an error processing your payment:')
      expect($('p#error').text()).to.have.string('Test error message.')
      expect($('#try-again').text()).to.have.string('Try again')
    })

  })
})
