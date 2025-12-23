# 🚀 GCC Creative Studio

![Angular](https://img.shields.io/badge/angular-%23DD0031.svg?style=for-the-badge&logo=angular&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Google Gemini](https://img.shields.io/badge/google%20gemini-8E75B2?style=for-the-badge&logo=google%20gemini&logoColor=white)
![Google Cloud](https://img.shields.io/badge/GoogleCloud-%234285F4.svg?style=for-the-badge&logo=google-cloud&logoColor=white)
[![linting: pylint](https://img.shields.io/badge/linting-pylint-yellowgreen?style=for-the-badge)](https://github.com/pylint-dev/pylint)
[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg?style=for-the-badge)](https://github.com/google/gts)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

Creative Studio is a comprehensive, all-in-one Generative AI platform designed as a deployable solution for your own Google Cloud project. It serves as a powerful reference implementation and creative suite, showcasing the full spectrum of Google's state-of-the-art generative AI models on Vertex AI.

Built for creators, marketers, and developers, this application provides a hands-on, interactive experience with cutting-edge multimodal capabilities.

> ###### _This is not an officially supported Google product. This project is not eligible for the [Google Open Source Software Vulnerability Rewards Program](https://bughunters.google.com/open-source-security)._

## Core Features 🎨
Creative Studio goes beyond simple demos, implementing advanced, real-world features that developers can learn from and build upon:

**🎬 Advanced Video Generation (Veo):**
- Generate high-quality videos from text prompts.
- Utilize Image-to-Video (R2V) capabilities, allowing users to upload reference images.
- Differentiate between reference types, using images for ASSET consistency or STYLE transfer.

**🖼️ High-Fidelity Image Generation (Imagen):**
- Create stunning images from detailed text descriptions.
- Explore a wide range of creative styles, lighting, and composition controls.

**✍️ Gemini-Powered Prompt Engineering:**
- **Prompt Rewriting:** Automatically enhance and expand user prompts for superior generation results.
- **Multimodal Critic:** Use Gemini's multimodal understanding to evaluate and provide feedback on generated images.

**📄 Brand Guidelines Integration:**
- Upload PDF style guides that the backend processes to automatically infuse brand identity into generated content.
- Features a robust, scalable upload mechanism using GCS Signed URLs to bypass server timeouts and handle large files efficiently.

**👕 Virtual Try-On (VTO):**
- Includes functionality for seeding system-level assets like garments and models, laying the groundwork for virtual try-on applications.


## GenMedia Screenshots | Creative Studio
![](./screenshots/cstudio-login.png)
![](./screenshots/cstudio-homepage.png)
![](./screenshots/cstudio-brand-guidelines.png)

## Deploy in 20min!!
Just run this script which has a step by step approach for you to deploy the infrastructure and start the app, just follow the instructions
```
curl https://raw.githubusercontent.com/GoogleCloudPlatform/gcc-creative-studio/refs/heads/main/bootstrap.sh | bash
```

For better guidance, [we recorded a video](./screenshots/how_to_deploy_creative_studio.mp4) to showcase how to deploy Creative Studio in a completely new and fresh GCP Account.

<video controls autoplay loop width="100%" style="max-width: 1200px;">
  <source src="./screenshots/how_to_deploy_creative_studio.mp4" type="video/mp4">
  Your browser does not support the video tag. You can <a href="./screenshots/how_to_deploy_creative_studio.mp4">download the video here</a>.
</video>


## System Architecture
![](./screenshots/creative-studio-architecture.png)

The backend follows a **Modular, Feature-Driven Architecture**, heavily inspired by the principles of Hexagonal Architecture (Ports & Adapters).

* **Structure:** Code is organized by feature domain (e.g., /images, /galleries, /users) rather than by technical layer (/controllers, /services).  
* **Rationale:**  
  * **Scalability:** This approach prevents individual directories from becoming unwieldy as the application grows.  
  * **Maintainability:** All code related to a single feature is co-located, making it easier to understand, modify, and test.  
  * **High Cohesion, Low Coupling:** Modules are self-contained and interact through well-defined interfaces (services and DTOs), making the system robust and flexible.

### Technology Stack

| Category | Technology / Service |
| :---- | :---- |
| **Frontend** | Angular, TypeScript, Angular Material, Tailwind CSS |
| **Backend** | Python, FastAPI, Pydantic |
| **Database** | Google Cloud SQL (PostgreSQL) |
| **Cloud Provider** | Google Cloud Platform (GCP) |
| **Deployment** | Cloud Run (for backend), Firebase Hosting (for frontend) |
| **AI Models** | Imagen, Veo, Gemini (via Vertex AI SDK) |


### Dependencies

Regarding the dependencies of the APIs and Services we’ll use (the Google APIs `‘xxxx.googleapis.com’` will be enabled by the script automatically):

* `Github Account` (You must have a Github Account to fork the repository)  
* `Google Cloud Account` (A GCP Project)
---
* `aiplatform.googleapis.com` (Vertex AI)  
* `artifactregistry.googleapis.com` (Artifact Registry)  
* `cloudbuild.googleapis.com` (Cloud Build)  
* `cloudfunctions.googleapis.com` (Cloud Functions)  
* `compute.googleapis.com` (Compute Engine)  
* `firebase.googleapis.com` (Firebase)  
* `sqladmin.googleapis.com` (Cloud SQL)  
* `iamcredentials.googleapis.com` (IAM Service API)  
* `iap.googleapis.com` (Cloud Identity-Aware Proxy)  
* `identitytoolkit.googleapis.com` (Identity Platform)  
* `run.googleapis.com` (Cloud Run)  
* `secretmanager.googleapis.com` (Secret Manager)  
* `texttospeech.googleapis.com` (Text to Speech)

For the deployment you can use CloudShell which already has all of the necessary, but in case of deploying from a computer, the script will automatically check for the following command-line tools and attempt to install them if they are missing or outdated.

* `gcloud` (Google Cloud SDK)  
* `git`  
* `jq` (JSON processor)  
* `firebase-tools` (Firebase CLI)  
* `uv` (Python package installer)  
* `terraform` (version 1.13.0 or newer) 


## Code Styling & Commit Guidelines

To maintain code quality and consistency:

* **TypeScript (Frontend):** We follow [Angular Coding Style Guide](https://angular.dev/style-guide) by leveraging the use of [Google's TypeScript Style Guide](https://github.com/google/gts) using `gts`. This includes a formatter, linter, and automatic code fixer.
* **Python (Backend):** We adhere to the [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html), using tools like `pylint` and `black` for linting and formatting.
* **Commit Messages:** We suggest following [Angular's Commit Message Guidelines](https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md) to create clear and descriptive commit messages.

### Frontend (TypeScript with `gts`)

(Assumes setup within the `frontend/` directory)

1.  **Initialize `gts` (if not already done in the project):**
    Navigate to `frontend/` and run:
    ```bash
    npx gts init
    ```
    This will set up `gts` and create necessary configuration files (like `tsconfig.json`). Ensure your `tsconfig.json` (or a related `gts` config file like `.gtsrc`) includes an extension for `gts` defaults, typically:
    ```json
    {
      "extends": "./node_modules/gts/tsconfig-google.json"
      // ... other configurations
    }
    ```
2.  **Check for linting issues:**
    (This assumes a `lint` script is defined in `frontend/package.json`, e.g., `"lint": "gts lint"`)
    ```bash
    # from frontend/ directory
    npm run lint
    ```
3.  **Fix linting issues automatically (where possible):**
    (This assumes a `fix` script is defined in `frontend/package.json`, e.g., `"fix": "gts fix"`)
    ```bash
    # from frontend/ directory
    npm run fix
    ```

### Backend (Python with `pylint` and `black`)

(Assumes setup within the `backend/` directory and its virtual environment activated)

1.  **Ensure Dependencies are Installed:**
    Add `pylint` and `black` to your `backend/requirements.txt` file if not already present:
    ```
    pylint
    black
    ```
    Then install them within your virtual environment:
    ```bash
    # from backend/ directory, with .venv activated
    pip install pylint black
    # or pip install -r requirements.txt
    ```
2.  **Configure `pylint`:**
    It's recommended to have a `.pylintrc` file in your `backend/` directory to configure `pylint` rules. You can generate one if it doesn't exist:
    ```bash
    # from backend/ directory
    pylint --generate-rcfile > .pylintrc
    ```
    Customize this file according to your project's needs and the Google Python Style Guide.
3.  **Check for linting issues with `pylint`:**
    Navigate to the `backend/` directory and run:
    ```bash
    # from backend/ directory
    pylint .
    # Or specify modules/packages: pylint your_module_name
    ```
4.  **Format code with `black`:**
    To automatically format all Python files in the `backend/` directory and its subdirectories:
    ```bash
    # from backend/ directory
    python -m black . --line-length=80
    ```

## Contributing

We welcome contributions to Creative Studio! Whether it's new templates, features, bug fixes, or documentation improvements, your help is valued.

### Prerequisites for Contributing

* A **GitHub Account**.
* **2-Factor Authentication (2FA)** enabled on your GitHub account.
* Familiarity with the "Getting Started" section to set up your development environment.

### Branching Model

We follow the [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/) branching model. Please create feature branches from `dev` and submit pull requests back to `dev`.

For more detailed contribution guidelines, please refer to the `CONTRIBUTING.md` file.

## Feedback

* **Found an issue or have a suggestion?** Please [raise an issue](https://github.com/GoogleCloudPlatform/gcc-creative-studio/issues) on our GitHub repository.
* **Share your experience!** We'd love to hear about how you're using Creative Studio or any success stories. Feel free to reach out to us at genmedia-creativestudio@google.com or discuss in the GitHub discussions.

# Relevant Terms of Service

[Google Cloud Platform TOS](https://cloud.google.com/terms)

[Google Cloud Privacy Notice](https://cloud.google.com/terms/cloud-privacy-notice)

# Responsible Use

Building and deploying generative AI agents requires a commitment to responsible development practices. Creative Studio provides to you the tools to build agents, but you must also provide the commitment to ethical and fair use of these agents. We encourage you to:

*   **Start with a Risk Assessment:** Before deploying your agent, identify potential risks related to bias, privacy, safety, and accuracy.
*   **Implement Monitoring and Evaluation:** Continuously monitor your agent's performance and gather user feedback.
*   **Iterate and Improve:**  Use monitoring data and user feedback to identify areas for improvement and update your agent's prompts and configuration.
*   **Stay Informed:**  The field of AI ethics is constantly evolving. Stay up-to-date on best practices and emerging guidelines.
*   **Document Your Process:**  Maintain detailed records of your development process, including data sources, models, configurations, and mitigation strategies.

# Disclaimer

**This is not an officially supported Google product.**

Copyright 2025 Google LLC. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.


# Step by step guide | Deploying and working on Creative Studio

This guide provides a comprehensive walkthrough for setting up and running the Creative Studio application **on your local machine**. It covers the **standard local development setup using Docker Compose**.

## 1. Prerequisites

Before you begin, ensure you have the following tools installed on your system:

*   **Git**: For cloning the repository.
*   **Google Cloud CLI (gcloud)**: For authenticating and managing your GCP resources.
*   **Github Account**: If you don't already have a GitHub account.
*   **Install Antigravity**: [Download Antigravity](https://antigravity.google/)
*   **Install Docker and docker compose**: [Download Docker](http://docker.com/get-started/)
*   **Install nvm**: [Download nvm](https://github.com/nvm-sh/nvm#installing-and-updating) and then install the latest node version. Version 20 or higher.
*   **Install uv**: A fast Python package installer. [Install it here](https://github.com/astral-sh/uv).

## 2. Initial Setup

1.  Go to your GCP Account and make sure you can login.
2.  After you create your account:
    *   You create a fork of [Open Source Repo](https://github.com/GoogleCloudPlatform/gcc-creative-studio/tree/main)
    *   You see this video [How to Deploy Creative Studio.mp4](./screenshots/how_to_deploy_creative_studio.mp4) and deploy Creative Studio into your GCP Account environment, using CloudShell for simplicity.

## 3. Add env variables to repo where we’ll work

You can connect to your new GCP Argolis Account by setting a `backend/.env` file for the backend and a `frontend/src/environments/development.environment.ts` file for the frontend.

> **Important!!!** set `isLocal = True`, in both frontend and backend, this is so that instead of loggin in with Identity Platform, we login with Firebase, and we keep Identity Platform Authorized Javascript origins clean, without the need to whitelist localhost.

Add the following env variables in your cloned repo “gcc-creative-studio” modifying the corresponding locations, and replacing with your env values:

### `backend/.env` file

```bash
# Common env vars
FRONTEND_URL="http://localhost:4200"
ENVIRONMENT="local"
LOG_LEVEL="INFO"

# Project ID: creative-studio-deploy
GOOGLE_CLOUD_PROJECT="creative-studio-deploy"
PROJECT_ID="creative-studio-deploy"
GENMEDIA_BUCKET="creative-studio-deploy-cs-development-bucket"
SIGNING_SA_EMAIL="cs-development-read@creative-studio-deploy.iam.gserviceaccount.com"
GOOGLE_TOKEN_AUDIENCE="XXXX-XXXXXXXXXXX.apps.googleusercontent.com"
IDENTITY_PLATFORM_ALLOWED_ORGS=""
```

### `frontend/src/environments/development.environment.ts` file

```typescript
export const environment = {
  // Project ID: creative-studio-deploy
  firebase: {
    apiKey: "your-api-key",
    authDomain: "creative-studio-deploy.firebaseapp.com",
    projectId: "creative-studio-deploy",
    storageBucket: "creative-studio-deploy.firebasestorage.app",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id",
    measurementId: "G-XXXXXXXX"
  },
  production: false,
  isLocal: true,
  GOOGLE_CLIENT_ID: 'XXXX-XXXXXXXXXXX.apps.googleusercontent.com',
  backendURL: 'http://localhost:8080/api',

  // Common env vars
  EMAIL_REGEX: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  ADMIN: 'admin',
};
```

## 4. Running with Docker Compose

We use Docker to build and run both the frontend and backend containers, simplifying the setup process.

After installation and before running docker compose, be sure to set your default gcloud login:

```bash
# Set the target project for the deployment
gcloud config set project $PROJECT_ID

# Set up application-default credentials
gcloud auth application-default login
```

And also to give your account access to presign the urls you’ll get on your frontend:

```bash
export PROJECT_ID=$(gcloud config get project)
export USER_EMAIL=$(gcloud config get account)

gcloud iam service-accounts add-iam-policy-binding cs-development-read@$PROJECT_ID.iam.gserviceaccount.com --member="user:$USER_EMAIL" --role="roles/iam.serviceAccountTokenCreator"
```

You are all set, from the root of the project, run the following command:

```bash
docker compose up
```

As this uses volumes, and we use hot reload to start the services, every time you change something on the files the container will be refreshed with the changes.
