# Clinoqox1 - Step-by-Step Free Deployment Guide

This guide details how to deploy the Cliniq-OX application for free using Supabase, Render, and Netlify.

## Step 1: Set up the Database (Supabase)
Supabase provides free, hosted PostgreSQL databases.

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project** and select your organization.
3. Name the project (e.g., `clinoqox-db`) and generate a strong **Database Password**. **Save this password somewhere safe!**
4. Choose a region close to your users and click **Create new project**.
5. Once the project finishes provisioning, go to **Project Settings** (the gear icon on the left).
6. Go to the **Database** tab.
7. Scroll down to **Connection string** and select **URI**.
8. Copy the connection string. It will look something like this:
   `postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`
9. Replace `[YOUR-PASSWORD]` with the password you created in step 3. This is your `DATABASE_URL`. Keep it handy for Step 2.

## Step 2: Deploy the Backend (Render)
Render will host your Node.js/Express API.

1. Go to [render.com](https://render.com) and sign in using your GitHub account.
2. From the Render Dashboard, click **New +** and select **Web Service**.
3. Under "Connect a repository", find and select your `cliniq-ox-v2` repository.
4. Render will automatically detect your `render.yaml` file and fill in most settings.
5. Ensure the **Instance Type** is set to **Free**.
6. Scroll down to **Advanced** and click **Add Environment Variable**. You need to add three variables:
   *   **Key**: `DATABASE_URL` | **Value**: (Paste the connection string from Step 1)
   *   **Key**: `JWT_SECRET` | **Value**: (Create a random, long string of characters and numbers)
   *   **Key**: `X_HOSPITAL_ID` | **Value**: (Enter your default hospital ID if your backend requires it immediately on boot)
7. Click **Create Web Service** at the bottom.
8. Render will now build and deploy your backend. Watch the logs. Once it says "Your service is live 🎉", copy the URL provided at the top left (it will look like `https://cliniq-ox-api.onrender.com`).
9. **Important:** Keep this URL handy for Step 3.

## Step 3: Connect Frontend to Backend
Before deploying the frontend, we must tell it where the backend lives.

1. Open your codebase locally.
2. Open the file `netlify.toml` in the root directory.
3. Find lines 6 and 11, and replace the API URL with the **new Render URL** you copied in Step 2.
   ```toml
   # Example:
   EXPO_PUBLIC_API_URL = "https://your-new-render-url.onrender.com"
   ```
4. Commit this change to Git and push it up to your GitHub repository.

## Step 4: Deploy the Frontend (Netlify)
Netlify will host the React Native web build.

1. Go to [netlify.com](https://netlify.com) and sign in with your GitHub account.
2. From your Team Overview, click **Add new site** and select **Import an existing project**.
3. Choose **GitHub** as your Git provider.
4. Search for and select your `cliniq-OX` repository.
5. Netlify will read your `netlify.toml` file and automatically configure the build settings (`Base directory: frontend`, `Build command: npx expo export...`, `Publish directory: dist`).
6. Click **Deploy site**.
7. Netlify will build your app. This might take a few minutes.
8. Once complete, Netlify will provide a free `.netlify.app` link. Click it to view your live Cliniq-OX web application!

---
**Troubleshooting Notes:**
*   **Backend Sleeps:** The free tier of Render spins down the backend after 15 minutes of inactivity. When you open the app after a while, the first API request might take 30-50 seconds to complete while Render wakes up the server.
*   **CORS Errors:** If you get "Failed to fetch" or CORS errors, verify that your backend URL in `netlify.toml` matches your Render URL exactly.
