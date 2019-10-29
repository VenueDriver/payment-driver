// Load environment variables and override anything already set.
const fs = require('fs')
const join = require('path').join

class Hook {

  constructor(){}

  async execute(name){
    let fn , dir = join("../../themes/",process.env.THEME_NAME || "default","/hooks/");
    console.log("Readdir sync:")
    console.log(fs.readdirSync(dir))
    try{
      fn = require(dir + name);
    }catch(e){
      console.log("No hook for",name);
    }
    if(fn){
      try{
        await fn();
      }catch(e){
        console.log("Something went wrong with your hook:");
        console.log(e);
      }
    }
  }

}

module.exports = new Hook();
