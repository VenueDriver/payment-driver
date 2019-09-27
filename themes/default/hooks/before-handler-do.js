async function beforeHandler(){

  console.log("beforeHandler Default")
  console.log("This is the handler name:",global.handler.name)
  console.log("This is the before handler do hook")
  console.log("This is the handler event:",global.handler.event)
  console.log("This is the handler context:",global.handler.context)
  if(global.handler.paymentRequest){
    console.log("This is the payment request:",global.handler.paymentRequest);
  }
  if(global.handler.stripeAmount){
    console.log("This is the amount sent to stripe:",global.handler.stripeAmount);
  }
  if(global.handler.stripePayload){
    console.log("This is the payload sent to stripe:",global.handler.stripePayload);
  }

}

module.exports = beforeHandler;
