// const route = require('./route');
const readdir   = require('fs').readdir;
const route     = require('./route');
const isPartial = require('./is-partial');

const mapName = function(filename,themeName){
  let name = filename.replace(/^\_/,'').replace(/\.mustache$/,'');
  let obj = {};
  obj[name] = route("templates/"+filename,themeName);
  return obj;
}

module.exports = function(themeName) {
  return new Promise((resolve,reject)=>{
    readdir(route("templates",themeName),(err,files)=>{
      if(err){ reject(err)}
      else{
        let partials  = {} , templates = {} ;
        files
          .filter(name => /\.mustache$/.test(name))
          .map( (filename)=> mapName(filename,themeName) )
          .forEach( route =>{
            if( isPartial(route) ) Object.assign(partials,route)
            else Object.assign(templates,route)
          });
        resolve({partials,templates});
      }
    })
  });
};