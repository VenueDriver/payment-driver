const fs = require('fs')
const mustache = require('mustache')
var aws = require('aws-sdk');
require('dotenv').load();

// Replace sender@example.com with your "From" address.
// This address must be verified with Amazon SES.
const sender = process.env.SENDER_EMAIL

// The subject line for the email.
const company = process.env.COMPANY_NAME
const subject = "Payment request from " + company;

// The email body for recipients with non-HTML email clients.
var text_template = fs.readFileSync('templates/emails/payment-request-email.txt.mustache', 'utf8')

// The HTML body of the email.
var html_template = fs.readFileSync('templates/emails/payment-request-email.html.mustache', 'utf8')

// The character encoding for the email.
const charset = "UTF-8";

var PaymentRequestEmail = function () {};

PaymentRequestEmail.prototype.sendEmail = function (paymentRequest, callback) {

  // Build a hash of template parameters by merging the payment request and some
  // extra context from the environment variables.
  var templateParameters = Object.assign(paymentRequest, {
    'company_name': process.env.COMPANY_NAME,
  })

  // Interpolate data into the email templates.s
  var bodyText = mustache.render(text_template, paymentRequest)
  var bodyHtml = mustache.render(html_template, paymentRequest)

  console.log("Email parameters:")
  console.log(paymentRequest)

  console.log("Sending email:")
  console.log(bodyHtml)
  console.log(bodyText)

  // Create a new SES object. 
  var ses = new aws.SES();

  // Specify the parameters to pass to the API.
  var email = {
    Source: sender,
    Destination: {
      ToAddresses: [
        paymentRequest['email']
      ],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: charset
      },
      Body: {
        Text: {
          Data: bodyText,
          Charset: charset
        },
        Html: {
          Data: bodyHtml,
          Charset: charset
        }
      }
    }
  };

  ses.sendEmail(email, callback);
};

exports.PaymentRequestEmail = new PaymentRequestEmail();
