const fs = require('fs');

module.exports = function(path,encoding){
  return new Promise((resolve,reject)=>{
    resolve(fs.readFileSync(path,encoding));
  });
}
