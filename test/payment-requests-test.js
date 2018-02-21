var chai = require('chai')
var expect = chai.expect;
const cheerio = require('cheerio')
var AWS = require('aws-sdk-mock')

// process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000'
var paymentRequests = require('../payment-requests');

describe('Payment Driver', function () {

  afterEach(function () {
    AWS.restore()
  })

  describe('payment requests REST resource', function () {

    it('should send a payment request form when the index is requested', function (done) {

      paymentRequests.get({}, {}, (error, result) => {
        try {
          expect(error).to.not.exist;
          expect(result.statusCode).to.equal(200);
          expect(result.headers['Content-Type']).to.equal('text/html');

          const $ = cheerio.load(result.body)
          expect($('legend').text()).to.have.string('Send a new payment request')

          done();
        }
        catch (error) {
          done(error);
        }
      });
    });


    it('should create a new DB record when the payment request form is posted', function (done) {

      AWS.mock('DynamoDB.DocumentClient', 'put', function (params, callback) {
        callback(null, 'Success!');
      });

      paymentRequests.post({ 'foo': 'bar' }, {}, (error, result) => {
        try {
          expect(error).to.not.exist;
          expect(result.statusCode).to.equal(200);
          expect(result.headers['Content-Type']).to.equal('text/html');

          const $ = cheerio.load(result.body)
          expect($('H1').text()).to.have.string('Requested')
          expect($('p.lead').text()).to.have.string('Your payment request was sent successfully.')

          done();
        }
        catch (error) {
          done(error);
        }
      });

    });

    it('should return an error when there is an error response from DynamoDB', function (done) {

      AWS.mock('DynamoDB.DocumentClient', 'put', function (params, callback) {
        callback('The sprockets have caught on fire!', null);
      });

      paymentRequests.post({}, {}, (error, result) => {
        try {
          expect(error).to.not.exist;
          expect(result.statusCode).to.equal(200);
          expect(result.headers['Content-Type']).to.equal('text/html');

          const $ = cheerio.load(result.body)
          expect($('H1').text()).to.have.string('Error')
          expect($('p.lead').text()).to.have.string('There was an error creating your payment request:')
          expect($('p#error').text()).to.have.string('The sprockets have caught on fire!')

          done();
        }
        catch (error) {
          done(error);
        }
      });

    });

  })
})
