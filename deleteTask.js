const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { sendResponse } = require('../utils/response');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'TaskVault-Tasks';

exports.handler = async (event) => {
    console.log("DELETE /tasks/{id} event:", JSON.stringify(event));

    try {
        const taskId = event.pathParameters ? event.pathParameters.id : null;
        if (!taskId) {
            return sendResponse(400, { message: "Task ID parameter is missing" });
        }

        const command = new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { taskId }
        });

        await docClient.send(command);
        return sendResponse(200, { message: "Task deleted successfully from DynamoDB", taskId });
    } catch (error) {
        console.error("Error deleting task from DynamoDB:", error);
        return sendResponse(500, { message: "Failed to delete task", error: error.message });
    }
};
