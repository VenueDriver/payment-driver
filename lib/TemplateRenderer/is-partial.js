module.exports = function (route){
  let key = Object.keys(route)[0];
  let path = route[key];
  return /\_\w+\.mustache/i.test(path);
}
