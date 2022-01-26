const AWS = require("aws-sdk");
AWS.config.update({
  region: "eu-west-1",
});
const moment = require("moment");
const generateResponse = require("./response");
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.add = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { type, capacity } = JSON.parse(event.body);
  const { userId } = event.requestContext.authorizer;

  const checkParams = {
    TableName: "Dormitories",
    Key: {
      userId,
    },
  };
  const params = {
    TableName: "Dormitories",
    Item: {
      type,
      userId,
      capacity: Number(capacity),
      isApproved: false,
      createAt: moment().utc().format(),
    },
  };
  try {
    const res = await documentClient.get(checkParams).promise();
    if (!res.Item) {
      await documentClient.put(params).promise();
      response = zr.send({});
    } else {
      response = zr.message("You have already applied!").send();
    }
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

exports.getById = async (event) => {
  let response;
  const zr = Object.create(generateResponse);

  const { userId } = event.pathParameters;
  const params = {
    TableName: "Dormitories",
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

exports.getByParameters = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { type, capacity } = event.queryStringParameters;

  const params = {
    TableName: "Dormitories",
    IndexName: "typeIndex",
    KeyConditionExpression: "#type = :tp AND #capacity = :cp ",
    ExpressionAttributeNames: {
      "#type": "type",
      "#capacity": "capacity",
    },
    ExpressionAttributeValues: {
      ":tp": type,
      ":cp": Number(capacity),
    },
  };
  try {
    const res = await documentClient.query(params).promise();
    response = zr.send({
      data: res.Items,
      totalCount: res.Items.length,
    });
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

exports.approve = async (event) => {
  let response;
  const { userId } = event.pathParameters;
  const zr = Object.create(generateResponse);

  const params = {
    TableName: "Dormitories",
    Key: {
      userId,
    },
    UpdateExpression: "set isApproved = :ad",
    ExpressionAttributeValues: {
      ":ad": true,
    },
  };
  try {
    await documentClient.update(params).promise();
    response = zr.send({});
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
