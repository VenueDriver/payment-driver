const join = require('path').join;

function route(path,themeName){
  return join( __dirname , '/../../public/themes/' , themeName || process.env.THEME_NAME || 'default' , path );
}

module.exports = route;
