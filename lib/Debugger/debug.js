class Debugger {

    constructor(){}

    debug (parameters = []){
        if(process.env.DEBUG){
            parameters.forEach(function(param){
                console.log(param);
            });
        }
    }


    printTrace(){
        if(process.env.DEBUG){
            console.trace();
        }
    }

    printError(parameters = []){
        this.printTrace();
        parameters.forEach(function(param){
            console.log(param);
        });
    }

    printDebugError(parameters = []){
        if(process.env.DEBUG){
            this.printTrace();
            parameters.forEach(function(param){
                console.log(param);
            });  
        } 
    }

    info(parameters = []){
        parameters.forEach(function(param){
            console.log(param);
        });
    }
}

module.exports = new Debugger();