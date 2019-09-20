const mustache    = require('mustache');
const urljoin     = require('url-join');
const load        = require('../TemplateRenderer/load');
const find        = require('../TemplateRenderer/find');
const deepMerge   = require('../../util/deep-merge');

class EmailTemplateRenderer {

  constructor(){
    this.templates  = {};
    this.routes     = null;
    this.load       = load;
  }

  async getRoutes(){
    if (!this.routes){

      this.routes = await find('/emails', false, "emails");

      if (process.env.THEME_NAME && process.env.THEME_NAME != 'default') {
        let defaultRoutes = await find('/emails','default', 'emails');
         console.log("Default email routes",defaultRoutes);
         this.routes = deepMerge(defaultRoutes,this.routes);
      }
    }

    console.log("EmailTemplateRenderer.routes",this.routes);
    return this.routes;
  }

  async render(template, parameters){
    await this.getRoutes();

    if(!this.templates[template]){
      let _single_route = {};
      _single_route[template] = this.routes.templates[template];

      if(/\//.test(template)){
        let p = template.split('/');
        _single_route[template] = this.routes[p[0]].templates[p[1]];
      }

      this.templates[template] = (await this.load(_single_route))[template];
    }

    // RENDER AND RETURN
    return mustache.render(
      this.templates[template],
      this.parameters(parameters),
    );
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
