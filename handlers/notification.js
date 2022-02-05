const AWS = require("aws-sdk");
AWS.config.update({
  region: "eu-west-1",
});
const moment = require("moment");
const uuid4 = require("uuid4");
const generateResponse = require("./response");
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.add = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { userId } = event.requestContext.authorizer;
  const { title, message } = JSON.parse(event.body);
  const params = {
    TableName: "Notifications",
    Item: {
      title,
      userId,
      message,
      notificationId: uuid4(),
      createAt: moment().utc().format("YYYY-MM-DD"),
    },
  };
  try {
    await documentClient.put(params).promise();
    response = zr.send();
  } catch (error) {
    console.log(JSON.stringify(error));
    response = zr
      .message(
        "User could not be accessed due to connection issues to the Campus Services!"
      )
      .send();
  }
  return response;
};

exports.get = async () => {
  let response;
  const zr = Object.create(generateResponse);
  const params = {
    TableName: "Notifications",
  };
  try {
    const res = await documentClient.scan(params).promise();
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

exports.remove = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { notificationId } = event.pathParameters;
  const params = {
    TableName: "Notifications",
    Key: {
      notificationId,
    },
  };
  try {
    const res = await documentClient.delete(params).promise();
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
