output "dynamodb_table_name" {
  description = "Name of the created DynamoDB Table"
  value       = aws_dynamodb_table.tasks.name
}

output "s3_bucket_name" {
  description = "Name of the created S3 Bucket for File Attachments"
  value       = aws_s3_bucket.attachments.id
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda IAM Execution Role"
  value       = aws_iam_role.lambda_exec.arn
}
