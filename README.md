# 🚀 TaskVault Cloud - AWS Serverless & GitHub Web Application

A full-stack serverless web application powered by **AWS Lambda**, **API Gateway**, **DynamoDB**, and **S3**, designed for automated hosting on **GitHub Pages** with GitHub Actions CI/CD.

![TaskVault Architecture](https://img.shields.io/badge/AWS-Serverless-orange?logo=amazon-aws)
![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue?logo=github)
![Infrastructure as Code](https://img.shields.io/badge/IaC-AWS%20SAM%20%7C%20Terraform-purple)

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    Client[User Web Browser / GitHub Pages UI] -->|HTTPS REST API| APIGW[AWS API Gateway]
    Client -->|Direct Upload via Presigned URL| S3[AWS S3 Bucket (Assets/Media)]
    APIGW -->|Proxy Integration| Lambda[AWS Lambda Functions (Node.js 18)]
    Lambda -->|Read / Write Items| Dynamo[AWS DynamoDB Table (Pay-Per-Request)]
    Lambda -->|Generate Presigned URLs| S3
```

### AWS Stack Components
- **AWS Lambda**: Node.js 18 serverless handlers (`getTasks`, `createTask`, `updateTask`, `deleteTask`, `getUploadUrl`).
- **AWS API Gateway**: REST API with CORS headers and proxy integration.
- **AWS DynamoDB**: NoSQL table (`TaskVault-Tasks`) storing cloud records with primary key `taskId`.
- **AWS S3 Bucket**: Asset bucket (`taskvault-assets-*`) with CORS rules allowing direct-from-browser uploads via presigned URLs.
- **GitHub Pages**: Free, automated static site hosting for the frontend application.

---

## 🚀 Quick Start & Local Execution

No AWS account is required to test the application locally! It includes an automatic **Local Mock Demo Mode**.

1. Simply open `index.html` in your web browser, or launch a simple local HTTP server:
   ```bash
   npx serve .
   # or
   python -m http.server 8000
   ```
2. Navigate to `http://localhost:8000` to interact with the TaskVault dashboard.

---

## 📦 Deploying to GitHub (GitHub Pages Hosting)

### 1. Initialize Git & Push to GitHub
Run the following commands in your terminal:
```bash
git init
git add .
git commit -m "Initial commit: TaskVault AWS Serverless App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 2. Enable GitHub Pages
1. Go to your repository on GitHub: `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME`
2. Click **Settings** > **Pages** (under Code and automation).
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy-frontend.yml` will automatically build and publish your site!
5. Your live app URL will be: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

---

## ⚡ Deploying Backend Infrastructure to AWS

You can deploy the AWS backend using either **AWS SAM (Recommended)** or **Terraform**.

### Option A: Deploy via AWS SAM CLI (Recommended)

1. **Install Prerequisites**:
   - [AWS CLI](https://aws.amazon.com/cli/) and run `aws configure` to set your credentials.
   - [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

2. **Build and Deploy**:
   ```bash
   cd infrastructure
   sam build
   sam deploy --guided
   ```
   Follow the prompts. SAM will provision:
   - DynamoDB Table
   - S3 Bucket
   - IAM Execution Roles
   - 5 Lambda Functions
   - API Gateway REST API

3. **Get Your API Endpoint**:
   After `sam deploy` finishes, copy the `ApiGatewayUrl` output (e.g. `https://xyz123.execute-api.us-east-1.amazonaws.com/Prod`).

4. **Connect Web App**:
   Open your GitHub Pages URL, click **Configure AWS Gateway**, paste the URL, and click **Save Endpoint Settings**.

---

### Option B: Deploy via Terraform

```bash
cd infrastructure
terraform init
terraform apply
```

---

## 🔑 Automated CI/CD with GitHub Actions

To allow GitHub Actions to deploy your AWS backend automatically on git push:

1. Go to your repository **Settings** > **Secrets and variables** > **Actions**.
2. Add the following repository secrets:
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
   - `AWS_REGION`: e.g. `us-east-1`

Every time you push changes to `main`, GitHub Actions will test and deploy both your frontend to GitHub Pages and your serverless stack to AWS!

---

## 📂 Project Directory Structure

```
.
├── index.html                   # High-aesthetic Single Page Application
├── styles.css                   # Glassmorphic & Neon Dark Theme design system
├── app.js                       # Frontend controller & API Gateway client
├── config.js                    # AWS Gateway configuration manager
├── backend/                     # AWS Lambda Functions
│   ├── package.json
│   ├── utils/
│   │   └── response.js          # CORS API Gateway response helper
│   └── handlers/
│       ├── getTasks.js          # GET /tasks (DynamoDB Scan)
│       ├── createTask.js        # POST /tasks (DynamoDB PutItem)
│       ├── updateTask.js        # PUT /tasks/{id} (DynamoDB UpdateItem)
│       ├── deleteTask.js        # DELETE /tasks/{id} (DynamoDB DeleteItem)
│       └── getUploadUrl.js      # POST /upload-url (S3 Presigned URL)
├── infrastructure/              # Infrastructure as Code
│   ├── template.yaml            # AWS SAM (CloudFormation) stack definition
│   ├── main.tf                  # Terraform main manifest
│   └── outputs.tf               # Terraform outputs
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml  # GitHub Pages CI/CD workflow
│       └── deploy-backend.yml   # AWS SAM Backend CI/CD workflow
└── README.md                    # Documentation & Deployment Guide
```
