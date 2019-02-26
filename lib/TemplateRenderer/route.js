const join = require('path').join;

function route(path){
  let base = __dirname + '/../../';
  if(process.env.THEME_NAME && process.env.THEME_NAME != "default"){
    base += '/public/themes/' + process.env.THEME_NAME;
  }
  let _absolute_route = join( base , path );
  return _absolute_route;
}

module.exports = route;
