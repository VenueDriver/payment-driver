// Load environment variables and override anything already set.
const fs = require('fs')
const join = require('path').join
const Logger = require('../Logger/log')

class Hook {

  constructor(){}

  async execute(name){
    let fn , dir = join("../../themes/",process.env.THEME_NAME || "default","/hooks/");
    try{
      fn = require(dir + name);
    }catch(e){
      if(e.code == 'MODULE_NOT_FOUND'){
        Logger.error(["No hook for",name])
      }else{
        Logger.error(["ERROR:",e])
      }
    }
    if(fn){
      try{
        await fn();
      }catch(e){
        Logger.error(["Something went wrong with your hook:",e]);
      }
    }
  }

}

module.exports = new Hook();
