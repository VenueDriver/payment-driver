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

#### Set up Stripe keys

Be sure to set the Stripe keys as environment variables:

    STRIPE_PUBLISHABLE_KEY
    STRIPE_SECRET_KEY

Example ~/.bash_profile code:

    export STRIPE_PUBLISHABLE_KEY="pk_..."
    export STRIPE_SECRET_KEY="sk_..."

Get the keys from the Stripe dashboard.

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

    cd lib/core; node-http-server root=public port=8081 verbose=true

(or you can run: ```npm run assets```)

#### Start an HTTP server with SAM Local

Use SAM Local for development:

    cd lib/core; sam local start-api -p 8080 --docker-network sam-local --static-dir ""

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

    npm run development

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