'use strict';
var fs = require('fs');

exports.get = function(event, context) {
 var formContents = fs.readFileSync("public/payment-request-form.html");
 context.succeed({
  statusCode: 200,
  headers: { 'Content-Type': 'text/html' },
  body: formContents.toString()
 });
};
