const route = require('./route');

module.exports = {
  home  : route( 'templates/home.mustache' ),
  login  : route( 'templates/login.mustache' )
};
