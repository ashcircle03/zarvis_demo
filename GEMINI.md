# Gemini Project Context

## 1. Project Vision & Overview

The goal is to build a fully web-based, touchless file management system for sterile environments. Users will interact with files on **AWS EFS** using a combination of **hand gestures** and **voice commands**, eliminating the need for physical input devices. The system is designed for critical applications in fields like medicine and semiconductor manufacturing where maintaining a sterile field is paramount.

All operations will be performed through a secure web application, with no local Python scripts required for the end-user.

## 2. Target Applications

*   **Medical Field:** Allows surgeons and lab technicians to browse and manage patient records, medical images (X-rays, MRIs), and procedural documents in an operating room or cleanroom without compromising sterility.
*   **Semiconductor Industry:** Enables engineers in cleanrooms to access design files, specifications, and quality control data on a shared EFS drive without introducing contaminants.

## 3. Core Features & User Experience

### a. Secure Authentication
*   Users must log in through a secure authentication portal before gaining access to the system.

### b. Main User Interface
The UI will be divided into several key components for intuitive operation:
*   **EFS File Tree (Left Panel):** A collapsible tree view of the EFS directory structure.
*   **File/Folder View (Center Panel):** Displays the contents of the currently selected directory.
*   **Clipboard (Right Panel):** A temporary holding area for files and folders selected for a "move" operation.
*   **Live Camera Feed (Corner):** A small, real-time view from the user's webcam.
*   **Hand Silhouette (Overlay):** A visual feedback mechanism that shows the user the detected hand shape/silhouette, confirming that their gestures are being tracked.

### c. Gesture-Based Interaction
*   **Navigation:** Use gestures to scroll through files, open folders, and navigate the file tree.
*   **Selection:** "Grab" or "pinch" gestures to select files/folders.
*   **Move Operation:**
    1.  Select an item.
    2.  Perform a gesture to "add to clipboard".
    3.  Navigate to the destination folder.
    4.  Perform a gesture to "paste" the item from the clipboard.

### d. Voice-Activated Folder Creation
*   A specific hand gesture will activate the microphone for recording.
*   The user speaks the desired folder name.
*   The system transcribes the speech to text and creates a new folder with that name in the current EFS directory.

## 4. Proposed AWS Architecture

The entire system will be cloud-native, leveraging a suite of AWS services for scalability, security, and performance.

*   **Frontend (Web Application):**
    *   **Hosting:** **AWS Amplify** or **Amazon S3 + CloudFront** for a globally distributed, fast, and secure web app.
    *   **Framework:** React.js with JavaScript/TypeScript.
    *   **Authentication:** **Amazon Cognito** will manage user identity, login, and session management. The frontend will use Amplify UI components to integrate with Cognito.
    *   **API Communication:** **Amazon API Gateway** will be the single entry point for all backend requests.
        *   **WebSocket API:** For persistent, low-latency communication between the frontend and the gesture recognition service.
        *   **REST API:** For authentication routes and other standard HTTP requests.

*   **Backend (Gesture & File Logic):**
    *   **Gesture Recognition Service:**
        *   **Compute:** A containerized Python application running on **AWS Fargate**. This provides the necessary long-running process for a persistent WebSocket connection to handle the real-time gesture stream from the client.
        *   **Logic:** The Python app will use **OpenCV** and **MediaPipe** to process the video stream and identify gestures.
    *   **EFS File Operations:**
        *   The Fargate service will be granted access to **Amazon EFS** via an **IAM Role**. It will use the AWS SDK (Boto3) to perform all file/folder manipulations (list, move, etc.) based on the recognized gestures.

*   **Backend (Voice-to-Folder Logic):**
    *   **Audio Upload:** The frontend will upload the recorded audio file to a specific **Amazon S3** bucket.
    *   **Transcription:** The S3 upload event will trigger an **AWS Lambda** function that starts a job on **AWS Transcribe**.
    *   **Folder Creation:** Upon completion, AWS Transcribe will place the text output in another S3 bucket. This second S3 event will trigger another **AWS Lambda** function, which reads the transcribed text and creates the corresponding folder in **Amazon EFS**.

## 5. Development & Deployment

*   **Infrastructure as Code (IaC):** The entire AWS infrastructure will be defined and managed using a framework like **AWS CDK** or **AWS SAM**. This enables repeatable, automated deployments.
*   **Frontend:** Developed as a standard React application (`package.json`).
*   **Backend:** The gesture service will be developed as a Docker container.