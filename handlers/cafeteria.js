const AWS = require("aws-sdk");
AWS.config.update({
  region: "eu-west-1",
});
const moment = require("moment");
const generateResponse = require("./response");
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.add = async (event) => {
  let response;
  const { name } = JSON.parse(event.body);
  const params = {
    TableName: "Cafeterias",
    Item: {
      cafeteriaId: moment().utc().format("YYYY-MM-DD") + name,
      reserved: 0,
      capacity: 30,
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

exports.reserve = async (event) => {
  let response;
  const { name } = JSON.parse(event.body);
  const params = {
    TableName: "Cafeterias",
    Key: {
      cafeteriaId: moment().utc().format("YYYY-MM-DD") + name,
    },
    UpdateExpression: "set reserved = reserved + :num",
    ExpressionAttributeValues: {
      ":num": 1,
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

exports.get = async () => {
  let response;
  const params = {
    TableName: "Cafeterias",
  };
  try {
    const res = await documentClient.scan(params).promise();
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
