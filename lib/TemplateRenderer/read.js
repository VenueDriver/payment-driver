const fs = require('fs');

module.exports = function(path,encoding){
  return new Promise((resolve,reject)=>{
    console.log("fs.readFileSync:",path);
    resolve(fs.readFileSync(path,encoding));
  });
}
