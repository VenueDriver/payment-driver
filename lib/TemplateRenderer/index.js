const mustache    = require('mustache');
const load        = require('./load');
const find        = require('./find');

class TemplateRenderer {

  constructor(){
    this.templates  = {};
    this.routes     = null;
    this.partials   = null;
    this.load       = load;
  }

  async render(page, parameters){
    // LOAD ROUTES IF NOT ALREADY DONE
    if(!this.routes){
      this.routes = await find();
      if(process.env.THEME_NAME && process.env.THEME_NAME != 'default'){
        let defaultRoutes = await find('default');
        this.routes.templates = Object.assign(defaultRoutes.templates,this.routes.templates);
        this.routes.partials = Object.assign(defaultRoutes.partials,this.routes.partials);
      }
    }

    console.log("TemplateRenderer.routes",this.routes);

    // LOAD ALL PARTIALS IF THEY HAVEN'T BEEN
    if(!this.partials) this.partials = await this.load(this.routes.partials);

    // LOAD JUST THE ONE PAGE THAT HAS BEEN REQUESTED
    if(!this.templates[page]){
      // EXTRACT JUST THE ONE ROUTE REQUESTED
      let _single_route = {};
      _single_route[page] = this.routes.templates[page];
      // READ SAID FILE AND STORE THE ONE VALUE
      this.templates[page] = (await this.load(_single_route))[page];
    }

    // RENDER AND RETURN
    return mustache.render(
      this.templates[page],
      this.parameters(parameters),
      this.partials
    );
  }

  parameters(parameters = {}){
    const defaults = {
      "base_url_path"     : global.handler.base_url,
      "base_url"          : global.handler.base_url,
      "assets_host"       : global.handler.assets_host,
      "theme_assets_host" : global.handler.theme_assets_host,
    };

    return Object.assign(defaults,parameters);
  }

}

let _instance = new TemplateRenderer();

module.exports = _instance;
