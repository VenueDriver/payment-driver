// Load environment variables and override anything already set.
const fs = require('fs')
const join = require('path').join

class Hook {

  constructor(){}

  async execute(name){
    console.log("Trying to execute hook",name);
    let fn;
    let dir = join("../../themes/",process.env.THEME_NAME || "default","/hooks/");
    try{
      fn = require(dir + name);
    }catch(e){
      console.log("No hook for",name);
      console.log(e);
    }
    if(fn){
      await fn();
    }else{
      console.log("function does not exist");
    }
  }

}

module.exports = new Hook();
