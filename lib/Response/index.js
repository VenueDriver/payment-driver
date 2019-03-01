const type = require('./type.js')
const urljoin = require('url-join')

class Response {

  constructor(type){
    this.type = type
  }

  send(data){
    if(typeof data == 'string') data = {body : data}
    return Object.assign((this.type) ? type[this.type] : {},data)
  }

  redirect(path = '',data = {}){
    if(!data.headers) data.headers = {}
    data.headers.location = urljoin(global.handler.base_url,path)
    this.send(data)
  }

}

module.exports = Response;
