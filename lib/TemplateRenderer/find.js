// const route = require('./route');
const readdir     = require('fs').readdir;
const route       = require('./route');
const isPartial   = require('./is-partial');
const isMustache  = require('./is-mustache');
const isDirectory = require('./is-directory');
const Debugger    = require('../Debugger/debug')

const mapName = function(filename,themeName,prefix=""){
  let name = filename.replace(/^\_/,'').replace(/\.mustache$/,'');
  let obj = {};
  obj[name] = route("templates/"+prefix+filename,themeName);
  return obj;
}

function findTemplates(path = "" , themeName = false , prefix = "") {
  return new Promise((resolve,reject)=>{
    readdir(route("templates"+ path , themeName ),async (err,files)=>{

      if(err){ reject(err)}
      else{
        let partials  = {} , templates = {} ;
        files
          .filter( isMustache )
          .map( filename => mapName( filename,themeName,prefix+"/") )
          .forEach( route => {
            if( isPartial(route) ) Object.assign(partials,route)
            else Object.assign(templates,route)
          });

        let response = {partials,templates};

        let directories = files.filter(isDirectory);

        for(let i = 0; i < directories.length ; i++){
            let dirName = directories[i];
            try{
              response[dirName] = await findTemplates("/"+dirName,themeName,dirName);
            }catch(e){
              Debugger.printError(['Error in findTemplates : ',error]);
              reject(e);
            }
        }

        resolve(response);
      }
    })
  });
};

module.exports = findTemplates;
