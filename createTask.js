const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { sendResponse } = require('../utils/response');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'TaskVault-Tasks';

exports.handler = async (event) => {
    console.log("POST /tasks event:", JSON.stringify(event));

    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});

        if (!body.title) {
            return sendResponse(400, { message: "Task title is required" });
        }

        const taskItem = {
            taskId: body.taskId || `task-${crypto.randomUUID()}`,
            title: body.title,
            category: body.category || 'Work',
            priority: body.priority || 'Medium',
            status: body.status || 'PENDING',
            description: body.description || '',
            s3FileUrl: body.s3FileUrl || '',
            s3FileName: body.s3FileName || '',
            createdAt: body.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: taskItem
        });

        await docClient.send(command);
        return sendResponse(201, { message: "Task created successfully", task: taskItem });
    } catch (error) {
        console.error("Error creating task in DynamoDB:", error);
        return sendResponse(500, { message: "Failed to create task", error: error.message });
    }
};
