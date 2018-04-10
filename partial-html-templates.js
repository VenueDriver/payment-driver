var fs = require('fs')
partials = function () {
  return {
    head: fs.readFileSync('templates/head.mustache', 'utf8'),
    header: fs.readFileSync('templates/header.mustache', 'utf8'),
    footer: fs.readFileSync('templates/footer.mustache', 'utf8'),
    scripts: fs.readFileSync('templates/scripts.mustache', 'utf8')
  }
}
