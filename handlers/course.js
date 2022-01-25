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
  const { userId } = event.requestContext.authorizer;
  const { courseName, courseCode, courseCredit, courseTeacher } = JSON.parse(
    event.body
  );
  const params = {
    TableName: "Courses",
    Item: {
      userId,
      courseId: uuid4(),
      courseName,
      courseCode,
      courseCredit,
      courseTeacher,
      createAt: moment().utc().format("YYYY-MM-DD"),
    },
  };
  try {
    await documentClient.put(params).promise();
    response = generateResponse.send({});
  } catch (error) {
    console.log(JSON.stringify(error));
    response = generateResponse
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
