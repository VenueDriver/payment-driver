'use strict';
var fs = require('fs')
var mustache = require('mustache')
require('./partial-html-templates')

exports.get = function (event, context, callback) {
  var template = fs.readFileSync('views/payment-request-form.mustache', 'utf8')
  var html = mustache.render(template, {}, partials())

  const response = {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html.toString()
  }
  callback(null, response)
};
