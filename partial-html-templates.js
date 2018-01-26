var fs = require('fs')
partials = function () {
  return {
    head: fs.readFileSync('views/head.mustache', 'utf8'),
    header: fs.readFileSync('views/header.mustache', 'utf8'),
    footer: fs.readFileSync('views/footer.mustache', 'utf8'),
    scripts: fs.readFileSync('views/scripts.mustache', 'utf8')
  }
}
