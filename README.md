# cheptalal-school-website
School website for CHEPTALAL GIRLS SECONDARY SCHOOL

## Local backend setup for breaking news
This project now includes a Node.js backend for the homepage breaking news banner and admin management panel.

### Run the server
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open the site in a browser at `http://localhost:3000`.
4. Manage breaking news at `http://localhost:3000/admin/breaking-news.html`.

### Admin password
The admin password is configured by the environment variable `ADMIN_PASSWORD`.
If not set, the default is `SchoolAdmin2026`.

## Firebase photo sync setup
This project uses Firebase Realtime Database to share uploaded gallery images across devices.

### 1. Create a Firebase project
1. Go to https://console.firebase.google.com/
2. Click **Add project** and follow the prompts.

### 2. Enable Realtime Database
1. In the Firebase Console, open **Build → Realtime Database**.
2. Click **Create database**.
3. Choose your database location.
4. Start in **test mode** for initial setup.

### 3. Update Firebase config
1. In Firebase Console, go to **Project settings → General**.
2. Scroll to **Your apps** and click **Add app** if needed.
3. Copy the web app config values.
4. Open `js/firebase-init.js`.
5. Replace the placeholder values in `firebaseConfig` with your actual values.

Example:
```js
const firebaseConfig = {
  apiKey: "ABC123...",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

### 4. Set database rules for testing
In Realtime Database rules, use:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> Important: This is only for testing. When you’re ready to publish, tighten these rules.

### 5. Serve the website and test
- Open `admin/login.html` and sign in.
- Upload a photo from the admin panel.
- Open `index.html` on another device.
- Refresh the page.

If Firebase is configured correctly, the uploaded photo should appear on both devices.

## Notes
- `js/firebase-init.js` contains the Firebase settings.
- `index.html` and `admin/admin.html` each load Firebase and reuse the same database.
- The admin panel still uploads image files to Cloudinary, while Firebase stores the resulting image URL metadata.
