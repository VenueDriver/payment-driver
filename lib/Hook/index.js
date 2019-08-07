// Load environment variables and override anything already set.
const fs = require('fs')
const join = require('path').join

class Hook {

  constructor(){}

  async execute(name){
    console.log("Trying to execute hook",name);
    let fm;
    try{
      let fm = require(join("../../themes/",process.env.THEME_NAME || "default","/hooks/",name));
    }catch(e){
      console.log("No hook for",name);
      console.log(e);
    }
    if(fm) await fm();
  }

}

module.exports = new Hook();
