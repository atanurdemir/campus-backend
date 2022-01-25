const AWS = require("aws-sdk");
AWS.config.update({
  region: "eu-west-1",
});
const uuid4 = require("uuid4");
const moment = require("moment");
const generateResponse = require("./response");
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.add = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { userId } = event.requestContext.authorizer;
  const { courseName, courseCode, courseCredit, courseTeacher } = JSON.parse(
    event.body
  );
  const checkParams = {
    TableName: "Courses",
    IndexName: "nameIndex",
    KeyConditionExpression: "courseName = :nm",
    ExpressionAttributeValues: {
      ":nm": courseName,
    },
  };
  const params = {
    TableName: "Courses",
    Item: {
      userId,
      courseName,
      courseCode,
      courseCredit,
      courseTeacher,
      courseId: uuid4(),
      createAt: moment().utc().format("YYYY-MM-DD"),
    },
  };
  try {
    const res = await documentClient.query(checkParams).promise();
    if (res.count === 0) {
      await documentClient.put(params).promise();
      response = zr.send({});
    } else {
      response = zr.message("You've already taken this course!").send();
    }
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

exports.getById = async (event) => {
  let response;
  const { userId } = event.requestContext.authorizer;
  const params = {
    TableName: "Courses",
    IndexName: "userIndex",
    KeyConditionExpression: "#userId = :ui",
    ExpressionAttributeNames: {
      "#userId": "userId",
    },
    ExpressionAttributeValues: {
      ":ui": userId,
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

exports.remove = async (event) => {
  let response;
  const { userId } = event.requestContext.authorizer;
  const { courseId } = event.pathParameters;
  const params = {
    TableName: "Courses",
    Key: {
      courseId,
    },
    ConditionExpression: "userId = :ui",
    ExpressionAttributeValues: {
      ":ui": userId,
    },
  };
  try {
    const res = await documentClient.delete(params).promise();
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
