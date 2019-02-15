const load = require('./load');
const route = require('./route');

const pages = {
  home  : route( 'templates/home.mustache' ),
};

let data = (async ()=>{
  return await load(pages);
})();

module.exports = data;
