module.exports = function (route){
  let key = Object.keys(route)[0];
  let path = route[key]
  let startsWithLowerDash =  /^\_/i.test(path)
  let endsWithMustache    =  /\.mustache$/i.test(path);
  return startsWithLowerDash && endsWithMustache
}
