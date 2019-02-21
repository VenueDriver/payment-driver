const type = require('./type.js');

class Response {

  constructor(type){
    this.type = type;
  }

  send(data){
    if(typeof data == "string") data = {body : data};
    return Object.assign(type[this.type] || {},data);
  }

}

module.exports = Response;
