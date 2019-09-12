Payment Driver
==============

A general payment service for sending payment requests that customers can pay, without our employees ever seeing the credit card information.

This project creates a serverless payment system using AWS Lambda, AWS API Gateway, AWS DynamoDB, and AWS Cognito,
with management users configured in AWS IAM.  This setup ensures a low operation cost (virtually free)
and high availability.

What's Here
-----------

This app includes:

* buildspec.yml - this file is used by AWS CodeBuild to package your
  application for deployment to AWS Lambda
* index.js - this file contains the sample Node.js code for the web service
* template.yml - this file contains the Serverless Application Model (SAM) used
  by AWS Cloudformation to deploy your application to AWS Lambda and Amazon API
  Gateway.

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

##### Upgrade Node

You want to use the same Node version that the Lambda functions use:

    nvm install 8.10

Make that the default:

    nvm alias default node

#### Set up Stripe keys

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

#### Start an asset server

Run this:

    node_modules/.bin/node-http-server root=themes port=8081 verbose=true

(or you can run: ```npm run assets```)

#### Install Node modules

The Lambda code running in SAM Local will need to be able to access the project's dependencies in the `node_modules` folder.  Create that and download those packages with:

    npm install

#### Start an HTTP server with SAM Local

Use SAM Local for development:

    cd lib/core; sam local start-api -p 8080 --docker-network sam-local --static-dir ""
    cd lib; sam local start-api -p 8080 --docker-network sam-local --static-dir ""

Port 8080 is important if you're using AWS Cloud9.

The ```--env-vars``` parameter loads environment variables from the ```env.json``` file.

The ```-docker-network``` parameter enables it to connect to the DynamoDB container.  SAM Local runs in a container, so without this you can't connect to the database.

The ```--static-dir ""``` parameter stops SAM Local from mounting the ```public``` folder on ```/``` on the HTTP server.  This project has a dynamic response on that URL path.  That's why you need to run the HTTP server for assets, when normally you could use SAM Local for that.

#### Go to the app in a web browser

To reach the form for the first user story, go to ```http://localhost:8080/payment-request-form.html```

To do a test Stripe transaction, ensure that your Stripe keys are set as described above.  Then send a GET request to the ```/payments``` REST resource: ```http://localhost:8080/payments```

#### Generate documentation

    documentation build lib/** -f html -o documentation/

Ongoing Development
-------------------

Each subsequent time that you want to spin up a development environment, do this:

#### Start your local DynamoDB service

    docker start dynamodb

#### Start an asset server

    npm run assets

This will run a static HTTP server and it will continue running in your terminal.

#### Start an HTTP server with SAM Local

Open another terminal window / tab / screen, and run:

    npm run server

### Shortcut

NPM can spin up a whole development environment for you, including the asset server, DynamoDB instance, and SAM Local server.  The disadvantage is that the asset server and the SAM Local server both have to run in the background, so you have to stop them by killing them.  Or by running the handy NPM scripts for stopping or restarting.

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

Payment management users
------------------------

Only authorized users can send payment requests and review payment records.  The users are managed by AWS IAM.  The web app uses the AWS Cognito [server-side flow](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-server-side-authentication-flow).

Now, with those three things running, you should be able to run the app and access it on port 8080.

#### Run tests

    npm test

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
- `before-sending-email-notifications`
- `after-sending-email-notifications`
