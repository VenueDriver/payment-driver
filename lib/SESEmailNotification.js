const template = require('./EmailTemplateRenderer');
var aws = require('aws-sdk');
// The character encoding for the email.
const charset = "UTF-8"

var SESEmailNotification = function () {}

SESEmailNotification.prototype.sendEmail =
  async function (templateName, templateParameters) {
    console.log('templateName: ' + templateName);
    console.log('templateParameters: ' + JSON.stringify(templateParameters))

    // The HTML body of the email.
    const bodyHtml = await template.render(`${templateName}.html`, templateParameters);
    // The email body for recipients with non-HTML email clients.
    const bodyText = await template.render(`${templateName}.txt`, templateParameters);

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
