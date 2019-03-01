const fs = require('fs')
const mustache = require('mustache')
const urljoin     = require('url-join')
var aws = require('aws-sdk')

// The character encoding for the email.
const charset = "UTF-8"

var SESEmailNotification = function () {}

SESEmailNotification.prototype.sendEmail =
  async function (templateName, templateParameters) {

    // The HTML body of the email.
    var html_template = fs.readFileSync("themes/default/templates/emails/" + templateName + ".html.mustache", 'utf8')

    // The email body for recipients with non-HTML email clients.
    var text_template = fs.readFileSync("themes/default/templates/emails/" + templateName + ".txt.mustache", 'utf8')

    // Build a hash of template parameters by merging the payment request and some
    // extra context from the environment variables.
    var templateParameters = Object.assign(templateParameters, {
      'company_name': process.env.COMPANY_NAME,
      'full_app_url': function () {
        return function (text, render) {
          return render(urljoin(global.handler.base_url, text))
      }}
    })

    // Interpolate data into the email templates.
    var bodyText = mustache.render(text_template, templateParameters)
    var bodyHtml = mustache.render(html_template, templateParameters)

    // Create a new SES object.
    var ses = new aws.SES()

    // Specify the parameters to pass to the API.
    var email = {
      Source:
        // This address must be verified with Amazon SES.
        process.env.SENDER_EMAIL,
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

    console.log('Sending email:')
    console.log(JSON.stringify(email))

    try {
      var data = await ses.sendEmail(email).promise()
    }
    catch (error) {
      console.log("Error sending email: " + error.message);
    }
  }

exports.SESEmailNotification = new SESEmailNotification()
