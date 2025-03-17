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
  // שימוש רק במשתני סביבה ללא ערכי ברירת מחדל
  const clientConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };
  
  // הוסף את אימייל האדמין לתשובה
  res.json({
    firebaseConfig: clientConfig,
    adminEmail: process.env.ADMIN_EMAIL
  });
});

// נתיב בסיסי לבדיקת חיבור
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'השרת פועל כראוי!' });
});
// הוסף בסוף, לאחר הנתיבים הספציפיים
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
// הגדרת פורט לפי משתנה סביבה או 3000 כברירת מחדל
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`השרת פועל על פורט ${port}`);
});
