# 🚀 מדריך פריסה ל-Vercel - Frontend + Backend

## 📋 מה יפורס:

✅ **Frontend** - React (Vite) - ממשק משתמש מעוצב
✅ **Backend** - Node.js + Firebase - API

הכל באתר אחד! ⚡

---

## 🎯 שלבים לפריסה:

### 1️⃣ הגדרת משתני סביבה ב-Vercel

לך ל-**Vercel Dashboard** → הפרויקט שלך → **Settings** → **Environment Variables**

הוסף את המשתנים הבאים:

```
FIREBASE_API_KEY = AIzaSyAFHUysA2FDFKDJfU3eUVvYnybeATWqUvY
FIREBASE_AUTH_DOMAIN = motorcycle-project-8a680.firebaseapp.com
FIREBASE_PROJECT_ID = motorcycle-project-8a680
FIREBASE_STORAGE_BUCKET = motorcycle-project-8a680.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID = 768175576428
FIREBASE_APP_ID = 1:768175576428:web:b7631b44f1da0ff9660f49
JWT_SECRET = (צור מפתח חזק - ראה למטה)
NODE_ENV = production
```

### 2️⃣ יצירת JWT Secret

**אופציה א'** - במחשב שלך:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**אופציה ב'** - אונליין:
https://randomkeygen.com/ → בחר "CodeIgniter Encryption Keys"

העתק את התוצאה והוסף כ-`JWT_SECRET`

### 3️⃣ Firebase Service Account (מומלץ!)

1. Firebase Console → **Project Settings** → **Service Accounts**
2. לחץ **"Generate new private key"**
3. שמור את קובץ ה-JSON
4. ב-Vercel, הוסף:
   - שם: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - ערך: **כל תוכן הקובץ JSON** (copy-paste הכל)

### 4️⃣ הגדרת Firebase Rules

#### Firestore Rules
Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

לחץ **Publish**

#### Storage Rules
Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

לחץ **Publish**

### 5️⃣ Deploy!

הקוד כבר בגיטהאב, אז:

**Vercel תעשה deploy אוטומטי!** 🎉

או ידנית:
```bash
git push origin main
```

Vercel תזהה את השינויים ותתחיל לבנות.

---

## ✅ בדיקה שהכל עובד:

### 1. בדוק Backend:
```
https://your-app.vercel.app/health
```

אמור להחזיר:
```json
{
  "success": true,
  "message": "Server is running with Firebase",
  "database": "Firestore"
}
```

### 2. בדוק Frontend:
```
https://your-app.vercel.app
```

אמור להראות מסך התחברות מעוצב! 🎨

---

## 👤 יצירת משתמש ראשון

אחרי שהאתר עלה, צור משתמש מנהל-על:

```bash
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@motorcycle-unit.com",
    "password": "Admin123!",
    "firstName": "שלמה זלמן",
    "lastName": "לרנר",
    "phone": "0501234567",
    "role": "super_admin"
  }'
```

עכשיו תוכל להתחבר:
- שם משתמש: `admin`
- סיסמה: `Admin123!`

---

## 🎨 מה תראה באתר:

1. **מסך התחברות** - עיצוב מודרני עם gradient סגול
2. **דשבורד** - 4 כרטיסים עם סטטיסטיקות
3. **ניהול רוכבים** - טבלה + חיפוש
4. **ניהול כלים** - טבלה + חיפוש
5. **תפריט צד** - ניווט קל וחלק

---

## 🔧 פתרון בעיות:

### Build נכשל
- ודא שכל משתני הסביבה מוגדרים
- בדוק Logs ב-Vercel Dashboard

### Backend לא עובד
- ודא ש-Firebase Rules מוגדרות
- בדוק שה-Service Account Key נכון

### Frontend לא נטען
- ודא שה-build הצליח
- בדוק שה-dist/ נוצר

### לא מצליח להתחבר
- צור משתמש דרך API (curl למעלה)
- בדוק שה-JWT_SECRET מוגדר

---

## 📊 מבנה ה-Deploy:

```
Vercel
├── Frontend (/)
│   └── React App מעוצב
└── Backend (/api/*)
    └── Firebase + Express API
```

**כל הקריאות ל-`/api/*` ילכו ל-Backend**
**כל השאר ילך ל-Frontend**

---

## 🎯 יתרונות:

✅ אתר אחד (לא צריך 2 domains)
✅ CORS לא בעיה (same origin)
✅ HTTPS אוטומטי
✅ Deploy אוטומטי מ-Git
✅ Preview של כל PR

---

## 📝 רשימת משתני סביבה (סיכום):

```
✅ FIREBASE_API_KEY
✅ FIREBASE_AUTH_DOMAIN
✅ FIREBASE_PROJECT_ID
✅ FIREBASE_STORAGE_BUCKET
✅ FIREBASE_MESSAGING_SENDER_ID
✅ FIREBASE_APP_ID
✅ FIREBASE_SERVICE_ACCOUNT_KEY (JSON מלא)
✅ JWT_SECRET (64 תווים אקראיים)
✅ NODE_ENV = production
```

---

## 🚀 אחרי הפריסה:

1. צור משתמש ראשון (curl למעלה)
2. התחבר באתר
3. צור רוכבים וכלים
4. תהנה מהמערכת! 🎉

---

**גרסה: 3.13.0**
**Stack: React + Vite + Firebase + Material-UI**

💡 **טיפ**: שמור את ה-URL של האתר והשתף עם הצוות!
