// sam-launchpad.config.js
const join = require('path').join;
const afterDeployHook = require('./sam-hooks/after-deploy');

module.exports = {
  "project_name" : "tmp-payment-driver",
  "projects" : join( __dirname , "./projects" ),
  "template_parameters" : {
    "ProjectId" : "1234abc",
    "CompanyName": process.env.COMPANY_NAME || "local",
    "SENDER_EMAIL": process.env.SENDER_EMAIL || "local",
    "CLIENT_ID": process.env.CLIENT_ID || "local",
    "USER_POOL_ID": process.env.USER_POOL_ID || "local",
    "STRIPE_SECRET_KEY": process.env.STRIPE_SECRET_KEY || "local",
    "STRIPE_PUBLISHABLE_KEY": process.env.STRIPE_PUBLISHABLE_KEY || "local"
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
