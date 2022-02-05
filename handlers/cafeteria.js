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
  const zr = Object.create(generateResponse);
  const params = {
    TableName: "Cafeterias",
    Item: {
      cafeteriaId: name + "?" + moment().utc().format("YYYY-MM-DD"),
      name: name,
      reserved: 0,
      capacity: 30,
      createAt: moment().utc().format("YYYY-MM-DD"),
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

exports.addCron = async () => {
  let response;
  const zr = Object.create(generateResponse);
  const names = ["Dining Hall", "Starbucks"];
  const params = {
    TableName: "Cafeterias",
    Item: {
      reserved: 0,
      capacity: 30,
      createAt: moment().utc().format("YYYY-MM-DD"),
    },
  };
  try {
    for (let i = 0; i < 2; i++) {
      params.Item["cafeteriaId"] =
        names[i] + "?" + moment().utc().format("YYYY-MM-DD");
      params.Item["name"] = names[i];
      await documentClient.put(params).promise();
    }
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

exports.reserve = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { cafeteriaId } = JSON.parse(event.body);
  const params = {
    TableName: "Cafeterias",
    Key: {
      cafeteriaId,
    },
    UpdateExpression: "set reserved = reserved + :num",
    ExpressionAttributeValues: {
      ":num": 1,
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

exports.get = async () => {
  let response;
  const zr = Object.create(generateResponse);
  const params = {
    TableName: "Cafeterias",
    IndexName: "dateIndex",
    KeyConditionExpression: "#createAt = :at",
    ExpressionAttributeNames: {
      "#createAt": "createAt",
    },
    ExpressionAttributeValues: {
      ":at": moment().utc().format("YYYY-MM-DD"),
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

exports.addReservation = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { cafeteriaId } = JSON.parse(event.body);
  const { userId } = event.requestContext.authorizer;
  const params = {
    TableName: "Reservations",
    Item: {
      cafeteriaId,
      createAt: moment().utc().format("YYYY-MM-DD"),
      userId: userId + "?" + moment().utc().format("YYYY-MM-DD"),
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

exports.getReservation = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { cafeteriaId } = event.pathParameters;
  const { userId } = event.requestContext.authorizer;
  const params = {
    TableName: "Reservations",
    Key: { userId: userId + "?" + moment().utc().format("YYYY-MM-DD") },
    FilterExpression: "cafeteriaId = :ci",
    ExpressionAttributeValues: {
      ":ci": cafeteriaId,
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

exports.getReservations = async (event) => {
  let response;
  const zr = Object.create(generateResponse);
  const { cafeteriaId } = event.pathParameters;
  const params = {
    TableName: "Reservations",
    IndexName: "cafeteriaIndex",
    KeyConditionExpression: "cafeteriaId = :id",
    ExpressionAttributeValues: {
      ":id": cafeteriaId,
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
