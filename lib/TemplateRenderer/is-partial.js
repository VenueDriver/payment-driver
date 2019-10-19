module.exports = function (route){
  let key                 = Object.keys(route)[0];
  let path                = route[key]
  let pathArray           = route[key].split("/")
  let filename            = pathArray[pathArray.length-1]
  let startsWithLowerDash =  /^\_/i.test(filename)
  let endsWithMustache    =  /\.mustache$/i.test(filename);
  return startsWithLowerDash && endsWithMustache
}
