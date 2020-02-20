class Logger {

  constructor(){}

  debug (parameters = []){
    if(process.env.DEBUG){
      parameters.forEach(function(param){ console.log(param); });
    }
  }

  printTrace(){
    if(process.env.DEBUG){ console.trace();
    }
  }

  error(parameters = []){
    this.printTrace();
    parameters.forEach(function(param){ console.log(param); });
  }

  info(parameters = []){ parameters.forEach(function(param){
    console.log(param); });
  }
}

module.exports = new Logger();
