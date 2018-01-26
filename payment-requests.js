'use strict';
var fs = require('fs');

exports.get = function (event, context, callback) {
  var html = fs.readFileSync("views/payment-request-form.html");

  const response = {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html.toString()
  };
  callback(null, response);
};
