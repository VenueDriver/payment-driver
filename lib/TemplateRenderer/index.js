const partials    = require('./partials');
const templates   = require('./templates');
const mustache    = require('mustache');

class TemplateRenderer {

  constructor(){

  }

  render( page , parameters){
    console.log("Templates",templates,"Partials",partials);
    return mustache.render( templates[page], this.parameters(parameters), partials );
  }

  parameters(parameters = {}){
    return Object.assign({
      'assets_host': process.env.ASSETS_HOST || "/public"
    },parameters);
  }

}

let _instance = new TemplateRenderer();

module.exports = _instance;
