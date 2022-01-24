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

exports.signup = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const {
    uni,
    idNo,
    email,
    place,
    family,
    health,
    teacher,
    lastName,
    emergency,
    firstName,
    highSchool,
    personalInfo,
    universityExam,
  } = JSON.parse(event.body);

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
      uni,
      idNo,
      place,
      email,
      family,
      health,
      teacher,
      lastName,
      firstName,
      emergency,
      highSchool,
      personalInfo,
      universityExam,
      password: idNo,
      userId: uuid4(),
      role: "Student",
      createAt: moment().utc().format(),
    },
  };

  try {
    const checkUser = await documentClient.query(checkParams).promise();
    if (checkUser.Items.length) {
      response = zr
        .message(
          "The e-mail you entered is already in use, please select an alternative."
        )
        .send();
    }
    await documentClient.put(params).promise();
    response = zr.send();
  } catch (error) {
    console.log(error);
    response = zr
      .message(
        "User could not be signup due to connection issues to the Campus Services."
      )
      .send();
  }
  return response;
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
          userId: checkUser.Items[0].userId,
          email: checkUser.Items[0].email,
          role: checkUser.Items[0].role,
          token: token,
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

exports.get = async (event) => {
  let response;
  const { email } = event.pathParameters;
  const params = {
    TableName: "Users",
    IndexName: "emailIndex",
    KeyConditionExpression: "email = :e",
    ExpressionAttributeValues: {
      ":e": email,
    },
  };
  try {
    const res = await documentClient.query(params).promise();
    response = generateResponse.send({ data: res.Items });
  } catch (error) {
    console.log(error);
    response = generateResponse
      .message(
        "User could not be accessed due to connection issues to the Campus Services!"
      )
      .send();
  }
  return response;
};

exports.getMe = async (event) => {
  let response;
  const { userId } = event.requestContext.authorizer;
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
        "User could not be accessed due to connection issues to the Campus Services!"
      )
      .send();
  }
  return response;
};

exports.updateUser = async (event) => {
  let response;
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
    response = generateResponse.send();
  } catch (error) {
    console.log(error);
    response = generateResponse
      .message(
        "User could not be updated due to connection issues to the Campus Services!"
      )
      .send();
  }
  return response;
};

exports.updateStudent = async (event) => {
  let response;
  const { userId } = event.pathParameters;
  //TODO: const { adminId } = event.requestContext.authorizer;
  const {
    idNo,
    email,
    place,
    family,
    health,
    lastName,
    emergency,
    firstName,
    highSchool,
    personalInfo,
    universityExam,
  } = JSON.parse(event.body);
  const updateAt = new Date().toISOString().split("T")[0];

  const params = {
    TableName: "User",
    Key: {
      userId,
    },
    UpdateExpression:
      "set idNo = :idno, email = :mail, place = :plac, family = :faml, health = :heal, lastName = :last, emergency = :emer, firstName = :frst, highSchool = :high, personalInfo = :prsn, universityExam = :exam, updateAt = :uptd",
    ExpressionAttributeValues: {
      ":idno": idNo,
      ":mail": email,
      ":plac": place,
      ":faml": family,
      ":heal": health,
      ":uptd": updateAt,
      ":last": lastName,
      ":emer": emergency,
      ":frst": firstName,
      ":high": highSchool,
      ":prsn": personalInfo,
      ":exam": universityExam,
    },
    ReturnValues: "UPDATED_NEW",
  };
  try {
    await documentClient.update(params).promise();
    response = generateResponse.send();
  } catch (error) {
    console.log(error);
    response = generateResponse
      .message(
        "User could not be updated due to connection issues to the Campus Services!"
      )
      .send();
  }
  return response;
};
