const express = require('express');
const path = require('path');
// טעינת משתני סביבה מקובץ .env.local
require('dotenv').config({ path: '.env.local' });

const app = express();

// שירות קבצים סטטיים מהתיקייה הנוכחית
app.use(express.static(__dirname));

// נתיב ברירת מחדל מחזיר את ה-index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// הוספת API נקודת קצה להחזרת קונפיגורציית Firebase
app.get('/api/firebase-config', (req, res) => {
  // שימוש במשתני סביבה, או בערכי ברירת מחדל אם חסרים
  const clientConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyC-AfsI6uqslEzbkW-rVPcGObo7TrRFOvs",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "progman-a47d6.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "progman-a47d6",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "progman-a47d6.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "702321893505",
    appId: process.env.FIREBASE_APP_ID || "1:702321893505:web:81175e361f953973ab6d80",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-F4Q6LY8FYE"
  };
  res.json(clientConfig);
});

// נתיב בסיסי לבדיקת חיבור
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'השרת פועל כראוי!' });
});

// הגדרת פורט לפי משתנה סביבה או 3000 כברירת מחדל
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`השרת פועל על פורט ${port}`);
});