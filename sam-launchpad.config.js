// sam-launchpad.config.js
const join = require('path').join;
const afterDeployHook = require('./sam-hooks/after-deploy');

module.exports = {
  "project_name": "payment-driver",
  "single_project": true,
  "base_path": join( __dirname ),
  "template_parameters": {
    "ProjectId": "1234abc",
    "CompanyName": process.env.COMPANY_NAME || "local",
    "SenderEmail": process.env.SENDER_EMAIL || "local",
    "ClientId": process.env.CLIENT_ID || "local",
    "UserPoolId": process.env.USER_POOL_ID || "local",
    "StripeSecretKey": process.env.STRIPE_SECRET_KEY || "local",
    "StripePublishableKey": process.env.STRIPE_PUBLISHABLE_KEY || "local"
  },
  "commands": {
    "build": "exit 0",
    "test": "npm i && npm test"
  },
  "hooks": {
    "after-deploy": [
      afterDeployHook
    ]
  }
}
