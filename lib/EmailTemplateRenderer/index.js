const urljoin  = require('url-join');
const renderer = require('../TemplateRenderer');

class EmailTemplateRenderer {
  async renderHtml(template, parameters){
    return await renderer.render(`emails/${template}.html`, this.parameters(parameters))
  }

  async renderText(template, parameters){
    return await renderer.render(`emails/${template}.txt`, this.parameters(parameters))
  }

  parameters(parameters = {}){
    const defaults = {
      'company_name': process.env.COMPANY_NAME,
      'full_app_url': function () {
        return function (text, render) {
          return render(urljoin(global.handler.base_url, text))
      }}
    };

    return Object.assign(defaults,parameters);
  }
}

let _instance = new EmailTemplateRenderer();

module.exports = _instance;
