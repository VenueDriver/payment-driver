// sam-launchpad.config.js
const join = require('path').join;

module.exports = {
  "project_name" : "tmp-payment-driver",
  "projects" : join( __dirname , "./projects" ),
  "template_parameters" : {
    "ProjectId" : "1234abc"
  },
  "commands" : {
    "build" : "npm i && npm run build",
    "test" : "exit 0"
  }
}
