const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { sendResponse } = require('../utils/response');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'TaskVault-Tasks';

exports.handler = async (event) => {
    console.log("PUT /tasks/{id} event:", JSON.stringify(event));

    try {
        const taskId = event.pathParameters ? event.pathParameters.id : null;
        if (!taskId) {
            return sendResponse(400, { message: "Task ID parameter is missing" });
        }

        const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});

        let updateExp = [];
        let expNames = {};
        let expValues = {};

        if (body.title !== undefined) {
            updateExp.push("#title = :title");
            expNames["#title"] = "title";
            expValues[":title"] = body.title;
        }
        if (body.category !== undefined) {
            updateExp.push("#category = :category");
            expNames["#category"] = "category";
            expValues[":category"] = body.category;
        }
        if (body.priority !== undefined) {
            updateExp.push("#priority = :priority");
            expNames["#priority"] = "priority";
            expValues[":priority"] = body.priority;
        }
        if (body.status !== undefined) {
            updateExp.push("#status = :status");
            expNames["#status"] = "status";
            expValues[":status"] = body.status;
        }
        if (body.description !== undefined) {
            updateExp.push("#description = :description");
            expNames["#description"] = "description";
            expValues[":description"] = body.description;
        }
        if (body.s3FileUrl !== undefined) {
            updateExp.push("#s3FileUrl = :s3FileUrl");
            expNames["#s3FileUrl"] = "s3FileUrl";
            expValues[":s3FileUrl"] = body.s3FileUrl;
        }

        updateExp.push("#updatedAt = :updatedAt");
        expNames["#updatedAt"] = "updatedAt";
        expValues[":updatedAt"] = new Date().toISOString();

        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { taskId },
            UpdateExpression: "SET " + updateExp.join(", "),
            ExpressionAttributeNames: expNames,
            ExpressionAttributeValues: expValues,
            ReturnValues: "ALL_NEW"
        });

        const result = await docClient.send(command);
        return sendResponse(200, { message: "Task updated successfully", task: result.Attributes });
    } catch (error) {
        console.error("Error updating task in DynamoDB:", error);
        return sendResponse(500, { message: "Failed to update task", error: error.message });
    }
};
