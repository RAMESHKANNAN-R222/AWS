const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { sendResponse } = require('../utils/response');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'TaskVault-Tasks';

exports.handler = async (event) => {
    console.log("GET /tasks event:", JSON.stringify(event));

    try {
        const command = new ScanCommand({
            TableName: TABLE_NAME
        });

        const result = await docClient.send(command);
        const tasks = result.Items || [];

        return sendResponse(200, { tasks, count: tasks.length });
    } catch (error) {
        console.error("Error fetching tasks from DynamoDB:", error);
        return sendResponse(500, { message: "Failed to fetch tasks", error: error.message });
    }
};
