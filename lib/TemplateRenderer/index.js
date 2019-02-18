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
    if(!this.partials) this.partials = await this.load(partials);
    if(!this.templates[page]){
      let _template = {}; _template[page] = templates[page];
      this.templates[page] = await this.load(_template)[page];
    }
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
