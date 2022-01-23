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

function generatePolicy(principalId, effect, resource, decryptedToken) {
  const authResponse = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument = {};
    policyDocument.Version = "2012-10-17";
    policyDocument.Statement = [];
    const statementOne = {};
    statementOne.Action = "execute-api:Invoke";
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }
  authResponse.context = {
    userId: decryptedToken.userId,
    username: decryptedToken.username,
    azerionConnectId: decryptedToken.azerionConnectId,
  };
  return authResponse;
}

function generateAllow(principalId, resource, decryptedToken) {
  return generatePolicy(principalId, "Allow", resource, decryptedToken);
}

exports.lambdaAuthorizer = (event, context, callback) => {
  const { headers } = event;
  const condition = {};
  condition.IpAddress = {};

  if (headers.Authorization !== "") {
    let decryptedToken = {
      userId: null,
      email: null,
    };
    if (headers.Authorization !== "public") {
      try {
        const data = JWTService.verifyToken(headers.Authorization);
        decryptedToken = data;
      } catch (e) {
        console.log("headers", headers, process.env.ACCESS_TOKEN_SECRET);
        callback("Unauthorized", headers.Authorization);
      }
    } else {
      // TODO: put here public urls
    }
    // elastic search sample data output
    console.log(event);
    console.log(decryptedToken);
    callback(null, generateAllow("me", event.methodArn, decryptedToken));
  } else {
    console.log("headers", headers);
    callback("Unauthorized");
  }
};

exports.signup = async (event) => {
  let response;
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
      idNo,
      place,
      email,
      family,
      health,
      password,
      lastName,
      firstName,
      emergency,
      highSchool,
      personalInfo,
      universityExam,
      userId: uuid4(),
      role: "Student",
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
      if (checkUser.Items[0].password !== password) {
        return (response = generateResponse
          .message("Incorrect password!")
          .send());
      }
      const tokenObj = {
        userId: checkUser.Items[0].userId,
        email: checkUser.Items[0].email,
        role: checkUser.Items[0].role,
      };
      const token = jwt.sign(tokenObj, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30 days",
      });
      response = generateResponse.send({
        userId: checkUser.Items[0].userId,
        email: checkUser.Items[0].email,
        role: checkUser.Items[0].role,
        token: token,
      });
    } else {
      response = generateResponse
        .message("No registered user found with this e-mail!")
        .send();
    }
  } catch (error) {
    console.log(error);
    response = generateResponse
      .message(
        "User could not be signin due to connection issues to the Campus Services!"
      )
      .send();
  }
  return response;
};

exports.get = async (event) => {
  let response;
  const { userId } = event.pathParameters;
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
