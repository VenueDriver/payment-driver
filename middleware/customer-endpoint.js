async function customerEndpoint(event, context) {

  global.handler.customer_facing = true;

}

module.exports = customerEndpoint;
