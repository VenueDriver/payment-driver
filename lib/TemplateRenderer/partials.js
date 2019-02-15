const load = require('./load');
const route = require('./route');

const partials = {
  navbar  : route( 'templates/navbar.mustache' ),
  head    : route( 'templates/head.mustache' ),
  logo    : route( 'templates/logo.mustache' ),
  footer  : route( 'templates/footer.mustache' ),
  scripts : route( 'templates/scripts.mustache' ),
};

let data = (async ()=>{
  return await load(partials);
})();

module.exports = data;
