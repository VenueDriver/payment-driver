const mustache        = require('mustache');
const urljoin         = require('url-join');
const load            = require('./load');
const find            = require('./find');
const deepMerge       = require('../../util/deep-merge');
const moment          = require('moment');

class TemplateRenderer {

  constructor(){
    this.templates  = {};
    this.routes     = null;
    this.partials   = null;
    this.load       = load;
    this.env        = {...process.env}
  }

  async getRoutes(){
    if(!this.routes){

      this.routes = await find();
      if(process.env.THEME_NAME && process.env.THEME_NAME != 'default'){
        let defaultRoutes = await find('','default');
        this.routes = deepMerge(defaultRoutes,this.routes);
      }
    }

    console.log("TemplateRenderer.routes",this.routes);
    return this.routes;
  }



  async render(page, parameters){
    // LOAD ROUTES IF NOT ALREADY DONE
    await this.getRoutes();

    let template, partials;


    // LOAD JUST THE ONE PAGE THAT HAS BEEN REQUESTED

    let _single_route = {};
    if(/\//.test(page)){
      let p = page.split('/');
      _single_route[page] = this.routes[p[0]].templates[p[1]]

      if(!this.partials) this.partials = {}
      partials = await this.load(this.routes[p[0]].partials)

    }else{
      // EXTRACT JUST THE ONE ROUTE REQUESTED
      _single_route[page] = this.routes.templates[page]
      // LOAD ALL PARTIALS IF THEY HAVEN'T BEEN
      partials = await this.load(this.routes.partials)
    }

    // READ SAID FILE AND STORE THE ONE VALUE
    this.templates[page] = (await this.load(_single_route))[page]
    template = this.templates[page]
    console.log("Single route:",_single_route,"page",page,"template",template)


    // RENDER AND RETURN
    return mustache.render(
      template,
      this.parameters(parameters),
      partials
    );
  }




  async renderPartial(partial, parameters){

    // LOAD ROUTES IF NOT ALREADY DONE
    await this.getRoutes();


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

    console.log("index renderPartial result:",this.partials[partial])


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
          // Strip out the protocol from the URL.
          var url = render(urljoin(global.handler.base_url, text));
          url=/^http(s)?:(\/\/.+)$/i.exec(url);
          url=url[2];
          return render(url)
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
      "date_format" : function(){
        return function(text,render){
          console.log("date_format",text)
          let [dateString,format] = text.split(',')
          dateString = render(dateString)
          console.log("date_format",dateString,format)
          return moment(dateString).format(format)
        }
      },
      "truncate" : function(){
        return function(text,render){
          let [ str = "" ,length = "max=120", trail = "" ] = text.split(",")
          length = parseInt(length.replace(/\D/gi,''))
          str = render(str)
          if (str.length > length) {
              str = str.substring(0, length) + trail
          }
          return str
        }
      },
      "customer_facing" : global.handler.customer_facing || false,
      "asset_url" : global.handler.assets_host,
      "theme_asset_url" : global.handler.theme_assets_host,
      "handler" : this
    };


    return Object.assign(defaults,parameters);
  }

}

let _instance = new TemplateRenderer();

module.exports = _instance;
