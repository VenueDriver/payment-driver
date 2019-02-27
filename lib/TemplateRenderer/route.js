const join = require('path').join;

function route(path){
  return join( __dirname , '/../../public/themes/' , process.env.THEME_NAME || 'default' , path );
}

module.exports = route;
