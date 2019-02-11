// sam-launchpad.config.js
const join = require('path').join;
const afterDeployHook = require('./sam-hooks/after-deploy');

module.exports = {
  "project_name" : "tmp-payment-driver",
  "projects" : join( __dirname , "./projects" ),
  "template_parameters" : {
    "ProjectId" : "1234abc",
    "CompanyName": process.env.COMPANY_NAME || "local",
    "SenderEmail": process.env.SENDER_EMAIL || "local",
    "ClientId": process.env.CLIENT_ID || "local",
    "UserPoolId": process.env.USER_POOL_ID || "local",
    "StripeSecretKey": process.env.STRIPE_SECRET_KEY || "local",
    "StripePublishableKey": process.env.STRIPE_PUBLISHABLE_KEY || "local"
  },
  "commands" : {
    "build" : "npm i && npm run build",
    "test" : "exit 0"
  },
  "hooks" : {
    "after-deploy" : [
      afterDeployHook
    ]
  }
}
