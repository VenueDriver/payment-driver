require('./test-helper.js')
var chai = require('chai')
var expect = chai.expect
const cheerio = require('cheerio')
var AWS = require('aws-sdk-mock')

process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000'
var paymentRequests = require('../payment-requests')

describe('payment requests REST resource', function () {

  afterEach(function () {
    AWS.restore()
  })

  describe('an unauthorized, un-authenticated visitor', function() {

      it('should be redirected to the login form when they request the list', async() => {
        const result = await paymentRequests.index({
          'requestContext': {'httpMethod': 'GET', 'path':'/payment-requests'},
          'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'}
        },{})
        expect(result.statusCode).to.equal(302)
        expect(result.headers['location']).
          to.equal('https://example.com/')
      })

      it('should be redirected to the login form when they request a form', async() => {
        const result = await paymentRequests.new({
          'requestContext': {'httpMethod': 'GET', 'path':'/payment-requests-new'},
          'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'}
        },{})
        expect(result.statusCode).to.equal(302)
        expect(result.headers['location']).
          to.equal('https://example.com/')
      })

      it('should be redirected to the login form when they try to post a request', async() => {
        const result = await paymentRequests.post({
          'requestContext': {'httpMethod': 'POST', 'path':'/payment-requests'},
          'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'} }, {})
          expect(result.statusCode).to.equal(302)
          expect(result.headers['location']).
            to.equal('https://example.com/')
      })

      it('should be shown an individual request if they have a valid ID', async() => {

        AWS.mock('DynamoDB.DocumentClient', 'get', function (params, callback){
          callback(null,
            {Item:
              {
                id: "1234",
                created_at:	'2020-02-13T23:39:11.403Z',
                updated_at:	'2020-02-13T23:39:11.403Z',
                firstname: 'Testy',
                lastname:	'Testerson',
  	            email: 'test@example.com',
                requestor: 'requestor@example.com',
                amount:	'7500.00',
                paid: 'true',
                paid_at: '2020-02-14T08:43:54.966Z',
                description: 'DESCRIPTION GOES HERE',
                expiration:	'2020-02-17T00:00:00.000Z',
                payment: {
                  'foo':'bar'
                }
              }
            });
        })

        const result = await paymentRequests.index({
          'requestContext': {'httpMethod': 'GET', 'path':'/payment-requests'},
          'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'},
          'queryStringParameters': {'id':'1234', 'created_at':'2020-02-13T23:39:11.403Z'}
        },{})
        const $ = cheerio.load(result.body)

        expect(result.statusCode).to.equal(200)
        expect(result.headers['Content-Type']).to.equal('text/html');
        expect($('#firstname').attr('value')).to.have.string('Testy')
        expect($('#lastname').attr('value')).to.have.string('Testerson')
        expect($('#email').attr('value')).to.have.string('test@example.com')
        expect($('#amount').attr('value')).to.have.string('7500.00')
        expect($('#description').text()).to.have.string('DESCRIPTION GOES HERE')
      })

  })

  describe('an authorized admin user', function () {

    it('should be sent a payment request form when the index is requested', async() => {
      const result = await paymentRequests.new(
        { 'requestContext': {'httpMethod': 'GET', 'path':''}, 'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'} }, {})
      expect(result.statusCode).to.equal(200)
      expect(result.headers['Content-Type']).to.equal('text/html')

      const $ = cheerio.load(result.body)
      expect($('legend').text()).to.have.string('New payment request')
    })

    it('should be able to create a new DB record when the payment request form is posted', async() => {

      AWS.mock('DynamoDB.DocumentClient', 'put', function (params, callback) {
        callback(null, 'Success!')
      })

      AWS.mock('SES', 'sendEmail', function (params, callback) {
        callback(null, 'Success!')
      })

      const result = await paymentRequests.post(
        { 'requestContext': {'httpMethod': 'POST', 'path':''}, 'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'} }, {})
      expect(result.statusCode).to.equal(200)
      expect(result.headers['Content-Type']).to.equal('text/html')

      const $ = cheerio.load(result.body)
      expect($('H1').text()).to.have.string('Requested')
      expect($('p.lead').text()).to.have.string('Your payment request was sent successfully.')
    });

    it('should see an error when there is an error response from DynamoDB', async() => {

      AWS.mock('DynamoDB.DocumentClient', 'put', function (params, callback) {
        callback("The sprockets have caught on fire!");
      })
      const result = await paymentRequests.post(
        { 'requestContext': {'httpMethod': 'POST', 'path':''}, 'headers': { 'X-Forwarded-Proto':'https', 'Host': 'example.com'} }, {})
      expect(result.statusCode).to.equal(200);
      expect(result.headers['Content-Type']).to.equal('text/html')

      const $ = cheerio.load(result.body)
      expect($('H1').text()).to.have.string('Error')
      expect($('p.lead').text()).to.have.string('There was an error:')
      expect($('p#error').text()).to.have.string('The sprockets have caught on fire!')
    })

  })
})
