// Load environment variables and override anything already set.
const fs        = require('fs')
const dotenv    = require('dotenv')
const Response  = require('../Response')
const Hook      = require('../Hook')
const Logger  = require('../Logger/log')

class BaseHandler {

  constructor(name , options = {}){
    try {
      const envConfig = dotenv.parse(fs.readFileSync('.env'))
      for (var k in envConfig) { process.env[k] = envConfig[k] }
    }
    catch (err) {
      Logger.error(['Error in base handler constructor',err]);
      // There will not be a .env file in production.
    }

    const { middlewares } = options;
    this.name = name || "unnamed";
    this._handler = this.noHandler;
    this.do = this.do.bind(this);
    this._middlewares = middlewares || [];
  }

  noHandler(){
    throw new Error(`No handler assigned for "${this.name}" handler.`);
  }

  processEvent(){
    const event = this.event;
    // BASE URL
    if(event){
      if(event.requestContext && event.headers){
        let pathRegex = new RegExp(event.requestContext.resourcePath+"$");
        let base_path = event.requestContext.path.replace(pathRegex,'');
        Logger.debug(["base_path: " + base_path])
        // Force HTTPS.
        this.base_url = `${event.headers['X-Forwarded-Proto']}://${event.headers['Host']}${base_path}/`;
      }
      if(event.headers){
        this.assets_host =
          process.env.ASSETS_HOST ||
            '//' + (event.headers.Host.replace(/\:\d+$/g, '') + ':8081')
        this.theme_assets_host = `${this.assets_host}/${process.env.THEME_NAME}`;
      }
      this.httpMethod = event.requestContext.httpMethod;
    }
    Logger.debug(["this.base_url: " + this.base_url]);
  }

  makeGlobal(){
    global.handler = this;
  }

  willDo(callback){
    this._handler = callback.bind(this);
    return this;
  }

  async do(event,context){
    this.event = event;
    this.context = context;
    this.processEvent();
    this.makeGlobal();

    Logger.info(['event: ' + JSON.stringify(event)])
    Logger.info(['context: ' + JSON.stringify(context)])

    Logger.debug(['middlewares: ' + this._middlewares])
    for(let i = 0; i < this._middlewares.length ; i++){
      let output, middleware = this._middlewares[i];
      Logger.debug(['running middleware: ' + middleware])
      try{
        output = await middleware(event,context);
      }catch(e){
        Logger.error(["Middleware error",e]);
        output = new Response('error',{ error : e });
      }
      if(output) return output;
    }

    Hook.execute("before-handler-do");
    return this._handler(event,context);
  }

  middleware(md){
    if(typeof md == 'function') md = [md];
    md.forEach( fn => this._middlewares.push(fn) );
  }

}

module.exports = BaseHandler;
