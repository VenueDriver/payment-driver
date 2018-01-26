var chai = require('chai')
var expect = chai.expect;
const cheerio = require('cheerio')

var nock = require('nock')

var payments = require('../payments');

const stripe = require("stripe")('test');

describe('Payment Driver', function () {

  describe('payments REST resource', function () {

    it('should send a payment form when the index is requested', function (done) {

      payments.get({}, {}, (error, result) => {
        try {
          expect(error).to.not.exist;
          expect(result.statusCode).to.equal(200);
          expect(result.headers['Content-Type']).to.equal('text/html');

          const $ = cheerio.load(result.body)
          expect($('legend').text()).to.have.string('Please provide payment')

          done();
        }
        catch (error) {
          done(error);
        }
      });
    });

    it('should process a payment with Stripe when the payment form is posted', function (done) {

      nock('https://api.stripe.com:443', { "encodedQueryParams": true })
        .post('/v1/charges', "description=Sample%20Charge&currency=usd")
        .reply(200, {}, []);

      payments.post({}, {}, (error, result) => {
        try {
          expect(error).to.not.exist;
          expect(result.statusCode).to.equal(200);
          expect(result.headers['Content-Type']).to.equal('text/html');

          const $ = cheerio.load(result.body)
          expect($('H1').text()).to.have.string('Thank you')
          expect($('p.lead').text()).to.have.string('Your payment was processed successfully.')

          done();
        }
        catch (error) {
          done(error);
        }
      });

    });

    it('should return an error when there is an error response from Stripe', function (done) {

      nock('https://api.stripe.com:443', { "encodedQueryParams": true })
        .post('/v1/charges', "description=Sample%20Charge&currency=usd")
        .reply(400, { "error": { "type": "invalid_request_error", "message": "Test error message." } }, []);

      payments.post({}, {}, (error, result) => {
        try {
          expect(error).to.not.exist;
          expect(result.statusCode).to.equal(200);
          expect(result.headers['Content-Type']).to.equal('text/html');

          const $ = cheerio.load(result.body)
          expect($('H1').text()).to.have.string('Error')
          expect($('p.lead').text()).to.have.string('There was an error processing your payment:')
          expect($('p#error').text()).to.have.string('Test error message.')
          expect($('#try-again').text()).to.have.string('Try again')

          done();
        }
        catch (error) {
          done(error);
        }
      });

    });

  })
})
