var chai = require('chai')
// var sinon = require('sinon')
var expect = chai.expect
const cheerio = require('cheerio')
var AWS = require('aws-sdk-mock')

process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000'
var paymentRequests = require('../payment-requests')

describe('Payment Driver', function () {

  afterEach(function () {
    AWS.restore()
  })

  describe('payment requests REST resource', function () {

    it('should send a payment request form when the index is requested', async() => {
      const result = await paymentRequests.new({ 'requestContext': {'httpMethod': 'GET', 'path':''}, 'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'} }, {})
      expect(result.statusCode).to.equal(200)
      expect(result.headers['Content-Type']).to.equal('text/html')

      const $ = cheerio.load(result.body)
      expect($('legend').text()).to.have.string('New payment request')
    })

    it('should create a new DB record when the payment request form is posted', async() => {

      AWS.mock('DynamoDB.DocumentClient', 'put', function (params, callback) {
        callback(null, 'Success!')
      })

      AWS.mock('SES', 'sendEmail', function (params, callback) {
        callback(null, 'Success!')
      })

      const result = await paymentRequests.post({ 'headers': { 'Origin': 'https://paymentdriver.engineering' } }, {})
      expect(result.statusCode).to.equal(200)
      expect(result.headers['Content-Type']).to.equal('text/html')

      const $ = cheerio.load(result.body)
      expect($('H1').text()).to.have.string('Requested')
      expect($('p.lead').text()).to.have.string('Your payment request was sent successfully.')
    });

    it('should return an error when there is an error response from DynamoDB', async() => {

      AWS.mock('DynamoDB.DocumentClient', 'put', function (params, callback) {
        callback("The sprockets have caught on fire!");
      })
      const result = await paymentRequests.post({ 'headers': { 'Origin': 'https://paymentdriver.engineering' } }, {})
      expect(result.statusCode).to.equal(200);
      expect(result.headers['Content-Type']).to.equal('text/html')

      const $ = cheerio.load(result.body)
      expect($('H1').text()).to.have.string('Error')
      expect($('p.lead').text()).to.have.string('There was an error:')
      expect($('p#error').text()).to.have.string('The sprockets have caught on fire!')
    })

  })
})
