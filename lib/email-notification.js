const fs = require('fs')
const mustache = require('mustache')
var aws = require('aws-sdk')
require('dotenv').load()

// Replace sender@example.com with your "From" address.
// This address must be verified with Amazon SES.
const sender = process.env.SENDER_EMAIL

// The character encoding for the email.
const charset = "UTF-8"

var EmailNotification = function () {}

EmailNotification.prototype.sendEmail =
  async function (templateName, templateParameters, callback) {

    // The HTML body of the email.
    var html_template = fs.readFileSync("templates/emails/" + templateName + ".html.mustache", 'utf8')

    // The email body for recipients with non-HTML email clients.
    var text_template = fs.readFileSync("templates/emails/" + templateName + ".txt.mustache", 'utf8')

    // Build a hash of template parameters by merging the payment request and some
    // extra context from the environment variables.
    var templateParameters = Object.assign(templateParameters, {
      'company_name': process.env.COMPANY_NAME,
    })

    // Interpolate data into the email templates.
    var bodyText = mustache.render(text_template, templateParameters)
    var bodyHtml = mustache.render(html_template, templateParameters)

    console.log("Email parameters:")
    console.log(templateParameters)

    console.log("Sending email to " + templateParameters.to)
    console.log(bodyHtml)
    console.log(bodyText)

    // Create a new SES object.
    var ses = new aws.SES()

    // Specify the parameters to pass to the API.
    var email = {
      Source: sender,
      Destination: {
        ToAddresses: [
          templateParameters.to
        ],
      },
      Message: {
        Subject: {
          Data: templateParameters.subject,
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
    }
    console.log("Email for SES API: " + JSON.stringify(email))

    try {
      var data = await ses.sendEmail(email, callback).promise()
      console.log("Email sent. Message ID: ", data.MessageId);
    }
    catch (error) {
      console.log("Error sending email: " + error.message);
    }
    console.log("After.")
  }

exports.EmailNotification = new EmailNotification()
