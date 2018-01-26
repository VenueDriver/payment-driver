var sinon = require('sinon')
var assert = require('assert')

var chai = require('chai')
var expect = chai.expect;
const cheerio = require('cheerio')

var nock = require('nock')

var paymentRequests = require('../payment-requests');

describe('Payment Driver', function () {

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

  })
})
