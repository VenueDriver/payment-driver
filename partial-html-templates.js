var fs = require('fs')

module.exports = function () {
  return {
    navbar: fs.readFileSync('templates/navbar.mustache', 'utf8'),
    head: fs.readFileSync('templates/head.mustache', 'utf8'),
    logo: fs.readFileSync('templates/logo.mustache', 'utf8'),
    footer: fs.readFileSync('templates/footer.mustache', 'utf8'),
    scripts: fs.readFileSync('templates/scripts.mustache', 'utf8')
  }
}
