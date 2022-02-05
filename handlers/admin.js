const AWS = require("aws-sdk");
AWS.config.update({
  region: "eu-west-1",
});
require("dotenv").config();
const uuid4 = require("uuid4");
const moment = require("moment");
const generateResponse = require("./response");
const documentClient = new AWS.DynamoDB.DocumentClient();

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

exports.getStudent = async (event) => {
  let response;
  const { email } = event.pathParameters;
  const zr = Object.create(generateResponse);
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
    response = zr.send({ data: res.Items });
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

exports.updateStudent = async (event) => {
  let response;
  const { userId } = event.pathParameters;
  const zr = Object.create(generateResponse);
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
