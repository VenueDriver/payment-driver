const template = require('./EmailTemplateRenderer');
var aws = require('aws-sdk');
// The character encoding for the email.
const charset = "UTF-8"
const Debugger = require('./Debugger/debug')

var SESEmailNotification = function () {}

SESEmailNotification.prototype.sendEmail =
  async function (templateName, templateParameters) {
    Debugger.info(['templateName: ' + templateName]);
    Debugger.info(['templateParameters: ' + JSON.stringify(templateParameters)])

    // The HTML body of the email.
    const bodyHtml = await template.renderHtml(templateName, templateParameters);
    // The email body for recipients with non-HTML email clients.
    const bodyText = await template.renderText(templateName, templateParameters);

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
        ]
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

    if(Array.isArray(templateParameters.to)) email.Destination.ToAddresses = templateParameters.to
    if(templateParameters.bcc) email.Destination.BccAddresses = templateParameters.bcc
    if(templateParameters.cc)  email.Destination.CcAddresses  = templateParameters.cc

    Debugger.info(['Sending email:'])
    Debugger.info([JSON.stringify(email)])

    try {
      var data = await ses.sendEmail(email).promise()
    }
    catch (error) {
      Debugger.printError(["Error sending email: " + error.message]);
    }
  }

exports.SESEmailNotification = new SESEmailNotification()
