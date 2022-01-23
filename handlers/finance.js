const AWS = require("aws-sdk");
AWS.config.update({
  region: "eu-west-1",
});
const moment = require("moment");
const generateResponse = require("./response");
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.add = async (event) => {
  let response;
  const { userId, isPaid, noSemester, scholarship } = JSON.parse(event.body);
  const params = {
    TableName: "Finances",
    Item: {
      userId,
      isPaid,
      noSemester,
      scholarship,
      createAt: moment().utc().format(),
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

exports.get = async (event) => {
  let response;
  const { userId } = event.pathParameters;
  const params = {
    TableName: "Finances",
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

exports.getUnpaids = async () => {
  let response;
  const params = {
    TableName: "Finances",
    IndexName: "paidIndex",
    KeyConditionExpression: "isPaid = :ip",
    ExpressionAttributeValues: {
      ":ip": false,
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

exports.approve = async (event) => {
  let response;
  const { userId } = event.pathParameters;
  const params = {
    TableName: "Finances",
    Key: {
      userId,
    },
    UpdateExpression: "set isPaid = :ip",
    ExpressionAttributeValues: {
      ":ip": true,
    },
  };
  try {
    await documentClient.update(params).promise();
    response = generateResponse.send({});
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
