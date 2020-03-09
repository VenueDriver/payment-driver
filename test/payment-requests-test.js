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
      const result = await paymentRequests.index({
        'requestContext': {'httpMethod': 'GET', 'path':''},
        'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'}
      },{})
      const $ = cheerio.load(result.body)
      expect(result.statusCode).to.equal(200)
      expect($('#loginForm')).to.exist
    })

    it('should create a new DB record when the payment request form is posted', async() => {

      AWS.mock('DynamoDB.DocumentClient', 'put', function (params, callback) {
        callback(null, 'Success!')
      })

      AWS.mock('SES', 'sendEmail', function (params, callback) {
        callback(null, 'Success!')
      })

      const result = await paymentRequests.post(
        { 'requestContext': {'httpMethod': 'POST','path':''}, 'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'},
        'body': 'amount=1000.00&expiration=2020%2F02%2F08+22%3A30%3A00+%2B0000&event_open=2020%2F02%2F08+22%3A30%3A00+%2B0000',
        'queryStringParameters': {'payment-request-token':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGFmZl9waG9uZSI6IjQxNS04MTAtNzM3NSIsImV2ZW50X29wZW4iOiIyMDIwLzAzLzEwIDIyOjMwOjAwICswMDAwIiwiZXZlbnRfdGl0bGUiOiJPTU5JQSBUdWVzZGF5IiwiZW1haWwiOiJmcmFuY29tYXJzaWxpQGJ5dGVyeS5jb20iLCJzdGFmZl9maXJzdCI6IlBlYXJsIiwiYW1vdW50IjoyMDAwLjAsInJlc2VydmF0aW9uX3JlY29yZF9sb2NhdG9yIjoiNjcySzciLCJyZXNlcnZhdGlvbl9pZCI6MTY3MzQzNywic3RhZmZfbGFzdCI6IlZlcnpvc2EiLCJ2ZW51ZSI6Ik9NTklBIExhcyBWZWdhcyAocykiLCJ2ZW51ZV90aW1lem9uZSI6IlVTL1BhY2lmaWMiLCJzdGFmZl9qb2JfdGl0bGUiOiIiLCJldmVudF9kYXRlIjoiMjAyMC8wMy8xMCIsInZlbnVlX3RpbWV6b25lX29mZnNldCI6LTI4ODAwLCJsYXN0IjoiVGVzdCIsImZpcnN0IjoiRnJhbmNvIiwic3RhZmZfZW1haWwiOiJwdmVyem9zYUBoYWtrYXNhbi5jb20iLCJ2ZW51ZV9jb2RlIjoib21uaWFsdiIsInJlcXVlc3RvciI6InB2ZXJ6b3NhQGhha2thc2FuLmNvbSIsImV4cCI6MTU4MjU1NzQwMiwiYWNjb3VudCI6bnVsbCwibWluaW11bSI6MjAwMC4wfQ.2GNWVOsRI-SfTx8dDSvXkSI2jBj3HQiQvj4zygLrbBA'}
      }, {})
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
      const result = await paymentRequests.post(
        { 'requestContext': {'httpMethod': 'POST','path':''}, 'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'},
        'body': 'amount=1000.00&expiration=2020%2F02%2F08+22%3A30%3A00+%2B0000&event_open=2020%2F02%2F08+22%3A30%3A00+%2B0000',
        'queryStringParameters': {'payment-request-token':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGFmZl9waG9uZSI6IjQxNS04MTAtNzM3NSIsImV2ZW50X29wZW4iOiIyMDIwLzAzLzEwIDIyOjMwOjAwICswMDAwIiwiZXZlbnRfdGl0bGUiOiJPTU5JQSBUdWVzZGF5IiwiZW1haWwiOiJmcmFuY29tYXJzaWxpQGJ5dGVyeS5jb20iLCJzdGFmZl9maXJzdCI6IlBlYXJsIiwiYW1vdW50IjoyMDAwLjAsInJlc2VydmF0aW9uX3JlY29yZF9sb2NhdG9yIjoiNjcySzciLCJyZXNlcnZhdGlvbl9pZCI6MTY3MzQzNywic3RhZmZfbGFzdCI6IlZlcnpvc2EiLCJ2ZW51ZSI6Ik9NTklBIExhcyBWZWdhcyAocykiLCJ2ZW51ZV90aW1lem9uZSI6IlVTL1BhY2lmaWMiLCJzdGFmZl9qb2JfdGl0bGUiOiIiLCJldmVudF9kYXRlIjoiMjAyMC8wMy8xMCIsInZlbnVlX3RpbWV6b25lX29mZnNldCI6LTI4ODAwLCJsYXN0IjoiVGVzdCIsImZpcnN0IjoiRnJhbmNvIiwic3RhZmZfZW1haWwiOiJwdmVyem9zYUBoYWtrYXNhbi5jb20iLCJ2ZW51ZV9jb2RlIjoib21uaWFsdiIsInJlcXVlc3RvciI6InB2ZXJ6b3NhQGhha2thc2FuLmNvbSIsImV4cCI6MTU4MjU1NzQwMiwiYWNjb3VudCI6bnVsbCwibWluaW11bSI6MjAwMC4wfQ.2GNWVOsRI-SfTx8dDSvXkSI2jBj3HQiQvj4zygLrbBA'}
      }, {})
      expect(result.statusCode).to.equal(200);
      expect(result.headers['Content-Type']).to.equal('text/html')

      const $ = cheerio.load(result.body)
      expect($('H1').text()).to.have.string('Error')
      expect($('p.lead').text()).to.have.string('There was an error:')
      expect($('p#error').text()).to.have.string('The sprockets have caught on fire!')
    })

  })
})
