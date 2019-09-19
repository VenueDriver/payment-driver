var chai = require('chai')
var expect = chai.expect;
var MoneySanitizer = require('../lib/money/MoneySanitizer');

describe('Money Sanitizer', function () {
  it('should return 500.00 for 500', () => {
    expect(MoneySanitizer.sanitize('500')).to.have.string('500.00');
    expect(MoneySanitizer.sanitize(500)).to.have.string('500.00');
  });

  it('should return 500.20 for 500.2', () => {
    expect(MoneySanitizer.sanitize('500.2')).to.have.string('500.20');
    expect(MoneySanitizer.sanitize(500.2)).to.have.string('500.20');
  });
});

