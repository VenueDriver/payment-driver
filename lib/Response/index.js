const type = require('./type.js');

class Response {

  constructor(type){
    this.type = type;
  }

  send(data){
    return Object.assign(type[this.type],{
      body : data
    });
  }

}

module.exports = Response;
