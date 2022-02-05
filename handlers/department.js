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
  const { name, courses, semester } = JSON.parse(event.body);
  const params = {
    TableName: "Departments",
    Item: {
      name,
      courses,
      semester,
      departmentId: uuid4(),
      createAt: moment().utc().format(),
    },
  };
  try {
    await documentClient.put(params).promise();
    response = zr.send({});
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

exports.get = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { name, semester } = event.queryStringParameters;
  const params = {
    TableName: "Departments",
    IndexName: "departmentIndex",
    KeyConditionExpression: "#name = :na AND semester = :se ",
    ExpressionAttributeNames: {
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":na": name,
      ":se": Number(semester),
    },
  };
  try {
    const res = await documentClient.query(params).promise();
    response = zr.send({ data: res.Items });
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
