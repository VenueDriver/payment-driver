const read = require('./read');
const load = (routes)=>{
  return new Promise( async (resolve,reject)=>{

    let keys = Object.keys(routes);
    let promiseArray = keys.map( name => read(routes[name] , 'utf-8') );
    let files = await Promise.all(promiseArray);
    let response = {};

    keys.forEach( (name, index) => {
      response[name] = files[index];
    });

    console.log("load for routes:",routes)
    console.log("Result:",response)

    resolve(response);

  })
}


module.exports = load;
