const join = require('path').join;

function route(path){
  return join( __dirname , '/../../' , path );
}

module.exports = route;
