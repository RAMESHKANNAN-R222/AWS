const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { sendResponse } = require('../utils/response');

const s3 = new S3Client({});
const BUCKET_NAME = process.env.ATTACHMENTS_BUCKET || 'taskvault-assets-bucket';

exports.handler = async (event) => {
    console.log("POST /upload-url event:", JSON.stringify(event));

    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
        const fileName = body.fileName || `attachment-${Date.now()}`;
        const fileType = body.fileType || 'application/octet-stream';

        const cleanKey = `uploads/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: cleanKey,
            ContentType: fileType
        });

        // Generate 15-minute presigned PUT URL for client direct S3 upload
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
        const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${cleanKey}`;

        return sendResponse(200, {
            uploadUrl,
            fileUrl,
            key: cleanKey,
            expiresIn: 900
        });
    } catch (error) {
        console.error("Error generating S3 presigned URL:", error);
        return sendResponse(500, { message: "Failed to generate upload URL", error: error.message });
    }
};
