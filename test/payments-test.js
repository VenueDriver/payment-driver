var sinon = require('sinon')
var assert = require('assert')
var expect = require('chai').expect;
var nock = require('nock')

var payments = require('../payments');

const stripe = require("stripe")('test');

describe('Payment Driver', function () {

  describe('payments REST resource', function () {

    it('should send a payment form when the index is requested', function (done) {
      var context = {
        succeed: function (result) {
          done();
        },
        fail: function () {
          done(new Error('never context.fail'));
        }
      }

      payments.get({}, context, (error, result) => {
        try {
          expect(error).to.not.exist;
          expect(result).to.exist;
          expect(result.valid).to.be.true;
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
          expect(result).to.exist;
          expect(result.statusCode).to.equal(200);
          expect(result.body).to.have.string('Your payment was processed successfully.');
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
          expect(result).to.exist;
          expect(result.statusCode).to.equal(500);
          expect(result.body).to.equal('{"error":"Test error message."}')
          done();
        }
        catch (error) {
          done(error);
        }
      });

    });

  })
})
