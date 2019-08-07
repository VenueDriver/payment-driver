async function beforeHandler(){

  console.log("This is the before handler hook")
  console.log("This is the handler event:",global.handler.event)
  console.log("This is the handler context:",global.handler.context)

}

module.exports = beforeHandler;
