const route = require('./route');

module.exports = {
  navbar  : route( 'templates/navbar.mustache' ),
  head    : route( 'templates/head.mustache' ),
  logo    : route( 'templates/logo.mustache' ),
  footer  : route( 'templates/footer.mustache' ),
  scripts : route( 'templates/scripts.mustache' ),
};
