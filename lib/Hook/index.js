// Load environment variables and override anything already set.
const fs = require('fs')
const join = require('path').join
const Debugger = require('../Debugger/debug')

class Hook {

  constructor(){}

  async execute(name){
    let fn , dir = join("../../themes/",process.env.THEME_NAME || "default","/hooks/");
    try{
      fn = require(dir + name);
    }catch(e){
      if(e.code == 'MODULE_NOT_FOUND'){
        Debugger.printDebugError(["No hook for",name])
      }else{
        Debugger.printError(["ERROR:",e])
      }
    }
    if(fn){
      try{
        await fn();
      }catch(e){
        Debugger.printError(["Something went wrong with your hook:",e]);
      }
    }
  }

}

module.exports = new Hook();
