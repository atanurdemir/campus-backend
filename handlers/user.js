const AWS = require("aws-sdk");
AWS.config.update({
  region: "eu-west-1",
});
require("dotenv").config();
const uuid4 = require("uuid4");
const crypto = require("crypto");
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

var generateDeny = function (principalId, resource) {
  return generatePolicy(principalId, "Deny", resource);
};

exports.signup = async (event) => {
  let response;
  const body = JSON.parse(event.body);
  const {
    idNo,
    email,
    place,
    family,
    health,
    password,
    lastName,
    emergency,
    firstName,
    highSchool,
    personalInfo,
    universityExam,
  } = body;

  const checkParams = {
    TableName: "Users",
    IndexName: "emailIndex",
    KeyConditionExpression: "email = :e",
    ExpressionAttributeValues: {
      ":e": email,
    },
  };

  const params = {
    TableName: "Users",
    Item: {
      idNo,
      place,
      email,
      family,
      health,
      firstName,
      lastName,
      emergency,
      highSchool,
      personalInfo,
      universityExam,
      userId: uuid4(),
      createAt: moment().utc().format(),
    },
  };

  try {
    const checkUser = await documentClient.query(checkParams).promise();
    if (checkUser.Items.length) {
      return (response = generateResponse
        .message(
          "The e-mail you entered is already in use, please select an alternative."
        )
        .send());
    }
    const IV = crypto.randomBytes(8).toString("hex");
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      process.env.ENCRYPTION_KEY,
      IV
    );
    const encrypted =
      cipher.update(password, "utf8", "base64") + cipher.final("base64");
    params.Item.password = encrypted;
    params.Item.salt = IV;
    await documentClient.put(params).promise();
    response = generateResponse.send();
  } catch (error) {
    console.log(error);
    response = generateResponse
      .message(
        "User could not be signup due to connection issues to the Campus Services."
      )
      .send();
  }
  return response;
};

exports.signin = async (event) => {
  let response;
  const body = JSON.parse(event.body);
  const { email, password } = body;

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
      let decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        process.env.ENCRYPTION_KEY,
        checkUser.Items[0].salt
      );
      let decrypted =
        decipher.update(checkUser.Items[0].password, "base64", "utf8") +
        decipher.final("utf8");
      const tokenObj = {
        userId: checkUser.Items[0].userId,
        email: checkUser.Items[0].email,
      };
      const token = jwt.sign(tokenObj, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30 days",
      });
      return decrypted === password
        ? generateResponse.send({
            userId: checkUser.Items[0].userId,
            email: checkUser.Items[0].email,
            token: token,
          })
        : generateResponse.message("Incorrect password!").send();
    } else {
      response = generateResponse
        .message("No registered user found with this e-mail!")
        .send();
    }
  } catch (error) {
    console.log(error);
    response = generateResponse
      .message(
        "User could not be signin due to connection issues to the Azerion TrackingApp Services!"
      )
      .send();
  }
  return response;
};

exports.getUser = async (event) => {
  let response;
  const userId = event.requestContext.authorizer.userId;
  const params = {
    TableName: "Users",
    Key: {
      userId,
    },
  };
  try {
    const res = await documentClient.get(params).promise();
    response = generateResponse.send({ data: res.Item });
  } catch (error) {
    console.log(error);
    response = generateResponse
      .message(
        "User could not be accessed due to connection issues to the Azerion TrackingApp Services!"
      )
      .send();
  }
  return response;
};
