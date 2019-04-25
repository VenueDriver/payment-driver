module.exports = function(name){
  return /^\w/gi.test(name) && !/\.\w+/.test(name);
}
