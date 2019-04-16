module.exports = function (route){
  let key = Object.keys(route)[0];
  let path = route[key];
  return /\_[a-zA-Z0-9_-]+\.mustache/i.test(path);
}
