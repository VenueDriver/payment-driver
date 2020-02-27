class Logger {

  constructor(){}

  debug (parameters = []){
    if(process.env.DEBUG){
      parameters.forEach(function(param){ console.log(param) })
    }
  }

  error(parameters = []){
    parameters.forEach(function(param){ console.log(param) })
    console.trace()
  }

  info(parameters = []){ parameters.forEach(function(param){
    if(!process.env.TEST || process.env.DEBUG){
      console.log(param)
    }
  })}
}

module.exports = new Logger()
