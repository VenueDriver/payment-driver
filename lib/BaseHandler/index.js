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
    this.makeGlobal();
    return this._handler(event,context);
  }

}

module.exports = BaseHandler;
