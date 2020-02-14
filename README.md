Payment Driver
==============

A general payment service for sending payment requests that customers can pay, without our employees ever seeing the credit card information.

This project creates a serverless payment system using AWS Lambda, AWS API Gateway, AWS DynamoDB, and AWS Cognito, with management users configured in AWS IAM.  This setup ensures a low operation cost (virtually free) and high availability.

What's Here
-----------

This app includes:

* ```.js``` files - these files contain AWS Lambda functions for the service.
* template.yml - this file contains the Serverless Application Model (SAM) used by AWS Cloudformation to deploy your application to AWS Lambda and Amazon API Gateway.
* ```sam-launchpad.config.js``` - configuration for high-level deployment assistance scripting.
* package.json - This project uses the Node toolchain, and this file is for NPM.
* ```lib/``` - Code used by the Lambda functions.
* ```sam-hooks/``` - the ```after-deploy.js``` script hooks into the deployment and synchronizes the project's static asset files to AWS S3.
* ```themes/``` - This app supports white-label branding through swappable themes.  Add yours here to override templates, assets, and to provide code hooks that will run in Lambda before or after events.

Development Setup
-----------------

#### Set up environment

These instructions are specifically for setting up this project for development using AWS Cloud9.

##### Create and expand Cloud9 environment

Create a new Cloud9 environment, and expand it to at least about 25 GB.

https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/recognize-expanded-volume-linux.html

##### Install SAM

Using Linuxbrew to install SAM works great on the AWS AMI:

https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install-linux.html

##### Use the same Node version as AWS

You want to use the same Node version that the Lambda functions use:

    nvm install 8.10

Make that the default:

    nvm alias default node

#### Set up Stripe keys

This app processes payments using Stripe, so you'll need a Stripe account.  The keys come from the dashboard in Stripe.

Be sure to set the Stripe keys as environment variables in your `.env` file.

    STRIPE_PUBLISHABLE_KEY=XXXXXX
    STRIPE_SECRET_KEY=XXXXXX

#### Set up local DynamoDB tables

At the time that this was written, SAM Local cannot manage local DynamoDB tables for development.  You have to set them up manually.

First, you will need DynamoDB Local:

https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html

First, create a network for SAM Local to reach your local DynamoDB:

    docker network create sam-local

Then install and run DynamoDB Local, on that Docker network:

    docker run -d -v "$PWD":/dynamodb_local_db -p 8000:8000 --network sam-local --name dynamodb cnadiminti/dynamodb-local

If you have already done that once and downloaded the DynamoDB container before, then you can run the existing container with:

    docker start dynamodb

Once you have DynamoDB running on port 8000, create some tables:

    npm run create-tables

If you need to drop those tables and re-create them, then do this:

    npm run delete-tables

To scan the current contents of your ```payment_requests``` table:

    aws dynamodb scan --endpoint-url http://localhost:8000 --table-name payment_requests

### Shortcut

NPM can spin up a whole development environment for you, including an asset server,  a localDynamoDB instance, and SAM Local server.  The disadvantage is that the asset server and the SAM Local server both have to run in the background, so you have to stop them by killing them.  Or by running the handy NPM scripts for stopping or restarting.

#### Start

To start a development environment, run:

    npm run start

That will run:

* `npm run dynamodb`
* `npm run assets`
* `npm run server`

#### Stop

To stop those things:

    npm run stop`

#### Reset

To stop and restart everything:

    npm run reset

#### Go to the app in a web browser

To reach the form for the first user story, go to ```http://localhost:8080/payment-request-form.html```

To do a test Stripe transaction, ensure that your Stripe keys are set as described above.  Then send a GET request to the ```/payments``` REST resource: ```http://localhost:8080/payments```

Now, with those three things running, you should be able to run the app and access it on port 8080.

### Usage

#### Payment management users

Only authorized users can send payment requests and review payment records.  The users are managed by AWS IAM.  The web app uses the AWS Cognito [server-side flow](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-server-side-authentication-flow).

### Generating documentation

    documentation build lib/** -f html -o documentation/

### Running tests

    npm test

Set the `DEBUG` environment variable if you want to see the console output:

    DEBUG=true npm test

To run a single test:

    node_modules/mocha/bin/mocha -g 'should send a payment request form when the index is requested'

#### Operation hooks
You can add hooks to the theme by including a `async/await` compatible function inside `theme-name/hooks/hook-name.js`.
This is an example:
```javascript
// themes/default/hooks/before-handler-do.js
async function beforeHandler(){

  console.log("This is the handler name:",global.handler.name);
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

```

#### Hook name list
- `before-handler-do`
- `before-sending-to-stripe`
- `after-sending-to-stripe`
- `after-successful-payment`
- `after-unsuccessful-payment`
- `before-updating-dynamodb`
- `after-updating-dynamodb`
- `before-sending-confirmation-email-to-customer`
- `before-sending-confirmation-email-to-requestor`
- `before-sending-request-email-to-customer`
- `before-sending-request-email-to-requestor`
