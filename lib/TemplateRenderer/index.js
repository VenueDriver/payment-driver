const mustache    = require('mustache');
const urljoin     = require('url-join');
const load        = require('./load');
const find        = require('./find');
const deepMerge       = require('../../util/deep-merge');

class TemplateRenderer {

  constructor(){
    this.templates  = {};
    this.routes     = null;
    this.partials   = null;
    this.load       = load;
  }

  async getRoutes(){
    if(!this.routes){

      this.routes = await find();
      // if(process.env.THEME_NAME && process.env.THEME_NAME != 'default'){
      //   let defaultRoutes = await find('','default');
      //   this.routes.templates = deepMerge(defaultRoutes.templates,this.routes.templates);
      //   this.routes.partials = deepMerge(defaultRoutes.partials,this.routes.partials);
      // }
    }

    console.log("TemplateRenderer.routes",this.routes);
    return this.routes;
  }



  async render(page, parameters){
    // LOAD ROUTES IF NOT ALREADY DONE
    await this.getRoutes();


    // LOAD ALL PARTIALS IF THEY HAVEN'T BEEN
    if(!this.partials) this.partials = await this.load(this.routes.partials);

    // LOAD JUST THE ONE PAGE THAT HAS BEEN REQUESTED
    if(!this.templates[page]){
      // EXTRACT JUST THE ONE ROUTE REQUESTED
      let _single_route = {};
      _single_route[page] = this.routes.templates[page];

      if(/\//.test(page)){
        let p = page.split('/');
        _single_route[page] = this.routes[p[0]].templates[p[1]];
      }

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



  async renderPartial(partial, parameters){

    // LOAD ROUTES IF NOT ALREADY DONE
    await this.getRoutes();

    console.log("TemplateRenderer.routes",this.routes);

    // LOAD ALL PARTIALS IF THEY HAVEN'T BEEN
    if(!this.partials) this.partials = await this.load(this.routes.partials);

    // EXTRACT JUST THE ONE ROUTE REQUESTED
    let _single_route = {};
    _single_route[partial] = this.routes.partials[partial];

    if(/\//.test(partial)){
      let p = partial.split('/');
      _single_route[partial] = this.routes[p[0]].partials[p[1]];
    }

    console.log("Loading:",_single_route);

    // READ SAID FILE AND STORE THE ONE VALUE
    this.partials[partial] = (await this.load(_single_route))[partial];


    // RENDER AND RETURN
    return mustache.render(
      this.partials[partial],
      this.parameters(parameters),
      this.partials
    );

  }



  parameters(parameters = {}){
    const defaults = {
      "full_app_url": function () {
        return function (text, render) {
          return render(urljoin(global.handler.base_url, text))
      }},
      "full_asset_url": function () {
        return function (text, render) {
          return render(urljoin(global.handler.assets_host, text))
      }},
      "full_theme_asset_url": function () {
        return function (text, render) {
          return render(urljoin(global.handler.theme_assets_host, text))
      }},
      "url_join": function () {
        return function (text, render) {
          return render(urljoin(text))
      }},
      "asset_url" : global.handler.assets_host,
      "theme_asset_url" : global.handler.theme_assets_host,
    };

    return Object.assign(defaults,parameters);
  }

}

let _instance = new TemplateRenderer();

module.exports = _instance;
