

class BaseHandler {

  constructor(options = {}){
    const {name} = options;
    this.name = name || "unnamed";
    this._handler = this.noHandler;
    this.do = this.do.bind(this);
  }

  noHandler(){
    throw new Error(`No handler assigned for "${this.name}" handler.`);
  }

  processEvent(){
    const event = this.event;
    // BASE URL
    let pathRegex = new RegExp(event.requestContext.resourcePath+"$");
    let base_path = event.requestContext.path.replace(pathRegex,'');
    this.base_url = `${event.headers['X-Forwarded-Proto']}://${event.headers['Host']}/${base_path}`;
  }

  makeGlobal(){
    global.handler = this;
  }

  willDo(callback){
    this._handler = callback.bind(this);
    return this;
  }

  do(event,context){
    this.event = event;
    this.context = context;
    this.processEvent();
    console.log(this.base_url);
    this.makeGlobal();
    return this._handler(event,context);
  }

}

module.exports = BaseHandler;
