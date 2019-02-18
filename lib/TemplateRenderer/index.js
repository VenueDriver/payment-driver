const partials    = require('./partials');
const templates   = require('./templates');
const mustache    = require('mustache');
const load        = require('./load');

class TemplateRenderer {

  constructor(){
    this.templates  = {};
    this.partials   = null;
    this.load       = load;
  }

  async render( page , parameters){
    // LOAD ALL PARTIALS IF THEY HAVEN'T BEEN
    if(!this.partials) this.partials = await this.load(partials);

    // LOAD JUST THE ONE PAGE THAT HAS BEEN REQUESTED
    if(!this.templates[page]){
      // EXTRACT JUST THE ONE ROUTE REQUESTED
      let _single_route = {};
      _single_route[page] = templates[page];
      // READ SAID FILE AND STORE THE ONE VALUE
      this.templates[page] = await this.load(_single_route)[page];
    }

    // RENDER AND RETURN
    return mustache.render( this.templates[page], this.parameters(parameters), this.partials );
  }

  parameters(parameters = {}){
    return Object.assign({
      'assets_host': process.env.ASSETS_HOST || "/public"
    },parameters);
  }

}

let _instance = new TemplateRenderer();

module.exports = _instance;
