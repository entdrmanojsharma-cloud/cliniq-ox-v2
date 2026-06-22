# Clinoqox1 - Step-by-Step Free Deployment Guide

This guide details how to deploy the Cliniq-OX application for free using Supabase, Koyeb, and Netlify.

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

## Step 2: Deploy the Backend (Koyeb)
Koyeb will host your Node.js/Express API. It is fast, free, and does not put your app to sleep.

1. Go to [koyeb.com](https://app.koyeb.com) and sign up using your GitHub account.
2. From the dashboard, click **Create Web Service**.
3. Select **GitHub** as the deployment method.
4. Search for and select your `cliniq-OX` repository.
5. In the configuration settings:
   *   **Builder**: Choose **Buildpack** (it will auto-detect Node.js).
   *   **Run command**: Leave blank (it will automatically run `node index.js`).
   *   **Work directory**: Type exactly `backend`.
6. Scroll down to **Environment variables** and add these three:
   *   **Key**: `DATABASE_URL` | **Value**: (Paste the connection string from Step 1)
   *   **Key**: `JWT_SECRET` | **Value**: (Create a random string of characters and numbers)
   *   **Key**: `X_HOSPITAL_ID` | **Value**: (Enter your default hospital ID if required)
7. Scroll down to **Instance**, and select the **Free** tier (Eco).
8. Name your service (e.g., `cliniq-ox-api`) and click **Deploy**.
9. Koyeb will now build and deploy your backend. Once it is healthy, copy the Public URL provided (it will look like `https://your-app-name.koyeb.app`).
10. **Important:** Keep this URL handy for Step 3.

## Step 3: Connect Frontend to Backend
Before deploying the frontend, we must tell it where the backend lives.

1. Open your `cliniq-OX` codebase locally.
2. Open the file `netlify.toml` in the root directory.
3. Find lines 6 and 11, and replace the old API URL with the **new Koyeb URL** you copied in Step 2.
   ```toml
   # Example:
   EXPO_PUBLIC_API_URL = "https://your-koyeb-url.koyeb.app/api/v1"
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
*   **CORS Errors:** If you get "Failed to fetch" or CORS errors, verify that your backend URL in `netlify.toml` matches your Koyeb URL exactly.
