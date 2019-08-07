// Load environment variables and override anything already set.
const fs = require('fs')
const join = require('path').join

class Hook {

  constructor(){}

  async execute(name){
    let fm;
    try{
      let fm = require(join("../../themes/",process.env.THEME_NAME,"/hooks/",name));
    }catch(e){
      console.log("No hook for",name);
    }
    if(fm) await fm();
  }

}

module.exports = new Hook();
