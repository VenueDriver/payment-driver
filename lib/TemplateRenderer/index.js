const partials    = require('./partials');
const templates   = require('./templates');
const mustache    = require('mustache');
const load        = require('./load');
const urljoin     = require('url-join')

class TemplateRenderer {

  constructor(){
    this.templates  = {};
    this.partials   = null;
    this.load       = load;
    console.log("\nTemplates:\n",templates);
    console.log("\nEnv:\n",process.env);
  }

  async render(page, parameters){
    // LOAD ALL PARTIALS IF THEY HAVEN'T BEEN
    if(!this.partials) this.partials = await this.load(partials);

    // LOAD JUST THE ONE PAGE THAT HAS BEEN REQUESTED
    if(!this.templates[page]){
      // EXTRACT JUST THE ONE ROUTE REQUESTED
      let _single_route = {};
      _single_route[page] = templates[page];
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
    let event = global.handler.event;
    console.log("event.requestContext.path: " + event.requestContext.path)
    const defaults = {
      'base_url_path':
        // Turn "/login" into "/" and turn "/something/" into "/something/".
        event.requestContext.path.
          replace(/\/([^\/]*)$/, '') + '/',
      'assets_host':
        // Look for the ASSETS_HOST environment variable first.
        process.env.ASSETS_HOST ||
        // Fall back on looking at the same host, on port 8081.
        // For development mode.  (see: npm run assets, in README)
        ("//" + event.headers.Host + ":8081")
    };
    if(process.env.THEME_NAME != "default"){
      defaults.theme_assets_host = `${defaults.assets_host}/themes/${process.env.THEME_NAME}`;
    }
    console.log("TemplateRenderer.parameters.default\n\n",defaults);
    return Object.assign(defaults,parameters);
  }

}

let _instance = new TemplateRenderer();

module.exports = _instance;
