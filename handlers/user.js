const AWS = require("aws-sdk");
AWS.config.update({
  region: "eu-west-1",
});
require("dotenv").config();
const uuid4 = require("uuid4");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const generateResponse = require("./response");
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.lambdaAuthorizer = (event, context, callback) => {
  var headers = event.headers;
  var queryStringParameters = event.queryStringParameters;
  var pathParameters = event.pathParameters;
  var stageVariables = event.stageVariables;

  // Parse the input for the parameter values
  var tmp = event.methodArn.split(":");
  var apiGatewayArnTmp = tmp[5].split("/");
  var awsAccountId = tmp[4];
  var region = tmp[3];
  var restApiId = apiGatewayArnTmp[0];
  var stage = apiGatewayArnTmp[1];
  var method = apiGatewayArnTmp[2];
  var resource = "/";
  if (apiGatewayArnTmp[3]) {
    resource += apiGatewayArnTmp[3];
  }
  var authResponse = {};
  var condition = {};
  condition.IpAddress = {};

  if (headers.Authorization !== "") {
    let decryptedToken = {
      userId: "null",
      email: "null",
    };
    if (headers.Authorization !== "public") {
      try {
        const data = jwt.verify(
          headers.Authorization,
          process.env.ACCESS_TOKEN_SECRET
        );
        decryptedToken = data;
      } catch (e) {
        callback("Unauthorized");
      }
    } else {
      //TODO: put here public urls
    }
    callback(null, generateAllow("me", event.methodArn, decryptedToken));
  } else {
    callback("Unauthorized");
  }
};

var generatePolicy = function (principalId, effect, resource, decryptedToken) {
  var authResponse = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    var policyDocument = {};
    policyDocument.Version = "2012-10-17";
    policyDocument.Statement = [];
    var statementOne = {};
    statementOne.Action = "execute-api:Invoke";
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }
  authResponse.context = {
    userId: decryptedToken.userId,
    email: decryptedToken.email,
  };
  return authResponse;
};

var generateAllow = function (principalId, resource, decryptedToken) {
  return generatePolicy(principalId, "Allow", resource, decryptedToken);
};

exports.signin = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { email, password } = JSON.parse(event.body);

  const checkParams = {
    TableName: "Users",
    IndexName: "emailIndex",
    KeyConditionExpression: "email = :e",
    ExpressionAttributeValues: {
      ":e": email,
    },
  };
  try {
    const checkUser = await documentClient.query(checkParams).promise();
    if (checkUser.Items[0]) {
      if (checkUser.Items[0].password === password) {
        const tokenObj = {
          userId: checkUser.Items[0].userId,
          email: checkUser.Items[0].email,
        };
        const token = jwt.sign(tokenObj, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "30 days",
        });
        response = zr.send({
          token: token,
          email: checkUser.Items[0].email,
          userId: checkUser.Items[0].userId,
          fullname:
            checkUser.Items[0].firstName + " " + checkUser.Items[0].lastName,
        });
      } else {
        response = zr.message("Incorrect password!").send();
      }
    } else {
      response = zr
        .message("No registered user found with this e-mail!")
        .send();
    }
  } catch (error) {
    console.log(error);
    response = zr
      .message(
        "User could not be signin due to connection issues to the Campus Services!"
      )
      .send();
  }
  return response;
};

exports.getMe = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { userId } = event.requestContext.authorizer;
  const params = {
    TableName: "Users",
    Key: {
      userId,
    },
  };
  try {
    const res = await documentClient.get(params).promise();
    response = zr.send({ data: res.Item });
  } catch (error) {
    console.log(error);
    response = zr
      .message(
        "User could not be accessed due to connection issues to the Campus Services!"
      )
      .send();
  }
  return response;
};

exports.updateUser = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { userId } = event.requestContext.authorizer;
  const { email, password } = JSON.parse(event.body);
  const updateAt = new Date().toISOString().split("T")[0];

  const params = {
    TableName: "User",
    Key: {
      userId,
    },
    UpdateExpression: "set email = :mail, password = :pass, updateAt = :uptd",
    ExpressionAttributeValues: {
      ":mail": email,
      ":uptd": updateAt,
      ":pass": password,
    },
    ReturnValues: "UPDATED_NEW",
  };
  try {
    await documentClient.update(params).promise();
    response = zr.send();
  } catch (error) {
    console.log(error);
    response = zr
      .message(
        "User could not be updated due to connection issues to the Campus Services!"
      )
      .send();
  }
  return response;
};
