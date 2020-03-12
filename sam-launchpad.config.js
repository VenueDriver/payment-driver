// sam-launchpad.config.js
const join = require('path').join;
const afterDeployHook = require('./sam-hooks/after-deploy');

module.exports = {
  "project_name": "payment-driver",
  "single_project": true,
  "base_path": join( __dirname ),
  "template_parameters": {
    "PlaidClientId":process.env.PLAID_CLIENT_ID || "local",
    "PlaidPublicKey":process.env.PLAID_PUBLIC_KEY || "local",
    "PlaidDevelopmentSecret":process.env.PLAID_DEVELOPMENT_SECRET || "local",
    "PlaidSandboxSecret":process.env.PLAID_SANDBOX_SECRET || "local",
    "ProjectId": "1234abc",
    "CompanyName": process.env.COMPANY_NAME || "local",
    "SenderEmail": process.env.SENDER_EMAIL || "local",
    "StripeSecretKey": process.env.STRIPE_SECRET_KEY || "local",
    "StripePublishableKey": process.env.STRIPE_PUBLISHABLE_KEY || "local",
    "ThemeName": process.env.THEME_NAME || "default",
    "NewPaymentRequestJwtSecret": process.env.NEW_PAYMENT_REQUEST_JWT_SECRET || "default",
    "AwsPaymentQueueName" : process.env.AWS_PAYMENT_QUEUE_NAME || "default"
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
