# 🔥 Firebase Setup Guide - מערכת CRM יחידת האופנועים

## ✅ מה כבר הוגדר

- ✅ Firebase project created
- ✅ Firestore Database enabled
- ✅ Firebase Storage enabled
- ✅ Firebase config integrated in code

---

## 📋 שלבים להרצה מקומית

### 1. התקנת חבילות

```bash
cd backend
npm install
```

### 2. הגדרת Firebase Security Rules

#### Firestore Rules
Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // בדיקת אימות בסיסית - דורש token
    match /{document=**} {
      allow read, write: if request.auth != null;
    }

    // ניתן לחדד יותר לפי collections:
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    match /riders/{riderId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null;
    }

    match /vehicles/{vehicleId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

#### Storage Rules
Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024  // 5MB max
        && request.resource.contentType.matches('image/.*|application/pdf');
    }
  }
}
```

### 3. הרצת השרת

```bash
# Development
npm run dev

# Production
npm start
```

אמור לראות:
```
╔═══════════════════════════════════════════════════╗
║   🏍️  מערכת CRM - יחידת האופנועים  🏍️           ║
║   🔥 Database: Firebase Firestore                ║
║   Server running in development mode             ║
╚═══════════════════════════════════════════════════╝
✅ Firebase initialized
```

---

## 🧪 בדיקת המערכת

### 1. בדיקת Health
```bash
curl http://localhost:5000/health
```

תשובה:
```json
{
  "success": true,
  "message": "Server is running with Firebase",
  "database": "Firestore"
}
```

### 2. רישום משתמש ראשון (Admin)
```bash
curl -X POST http://localhost:5000/api/auth/register \
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

### 3. התחברות
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!"
  }'
```

שמור את ה-`token` שמתקבל!

### 4. קבלת רשימת רוכבים (דורש token)
```bash
curl http://localhost:5000/api/riders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🚀 פריסה ל-Production (Vercel)

### שלב 1: הוסף משתני סביבה ב-Vercel

Vercel Dashboard → Settings → Environment Variables:

```
FIREBASE_API_KEY=AIzaSyAFHUysA2FDFKDJfU3eUVvYnybeATWqUvY
FIREBASE_AUTH_DOMAIN=motorcycle-project-8a680.firebaseapp.com
FIREBASE_PROJECT_ID=motorcycle-project-8a680
FIREBASE_STORAGE_BUCKET=motorcycle-project-8a680.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=768175576428
FIREBASE_APP_ID=1:768175576428:web:b7631b44f1da0ff9660f49
JWT_SECRET=<create-strong-secret>
NODE_ENV=production
```

### שלב 2: Service Account (מומלץ!)

1. Firebase Console → Project Settings → Service Accounts
2. לחץ "Generate new private key"
3. שמור את ה-JSON
4. Vercel → Environment Variables:
   - שם: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - ערך: העתק את **כל** תוכן קובץ ה-JSON (כ-string אחד)

### שלב 3: Deploy
```bash
git add .
git commit -m "Add Firebase support"
git push origin main
```

Vercel תעשה deploy אוטומטי!

---

## 📊 מבנה Firestore

### Collections:
```
/users
  /{userId}
    - username, email, password (hashed), role, ...

/riders
  /{riderId}
    - idNumber, firstName, lastName, phone, ...

/vehicles
  /{vehicleId}
    - licensePlate, type, manufacturer, model, ...

/assignments
  /{assignmentId}
    - rider (ref), vehicle (ref), startDate, ...

/tasks
  /{taskId}
    - title, rider, vehicle, status, ...

/monthly_checks
  /{checkId}
    - rider, vehicle, month, year, status, ...

/faults
  /{faultId}
    - vehicle, rider, description, severity, ...

/maintenance
  /{maintenanceId}
    - vehicle, date, type, costs, ...

/insurance_claims
  /{claimId}
    - vehicle, eventType, status, ...

/audit_logs
  /{logId}
    - user, action, entityType, changes, timestamp
```

---

## 🔒 אבטחה

### נקודות חשובות:
1. ✅ JWT tokens עם תוקף 30 יום
2. ✅ סיסמאות מוצפנות (bcrypt)
3. ✅ Role-based access control
4. ✅ Firestore rules מוגדרות
5. ✅ Storage rules מוגדרות

### לפרודקשן - חובה:
1. 🔐 שנה את `JWT_SECRET` למפתח חזק
2. 🔐 השתמש ב-Service Account Key
3. 🔐 חדד את Firestore Rules לפי roles
4. 🔐 הגבל CORS לדומיינים ספציפיים
5. 🔐 הפעל HTTPS בלבד

---

## 🆚 Firebase vs MongoDB

| תכונה | Firebase | MongoDB |
|------|---------|---------|
| Setup | ✅ קל מאוד | ⚠️ דורש Atlas/Server |
| Scaling | ✅ אוטומטי | ⚠️ ידני |
| Real-time | ✅ Built-in | ❌ דורש Socket.io |
| Storage | ✅ Built-in | ❌ צריך נפרד |
| Free Tier | ✅ 1GB | ✅ 512MB |
| Queries | ⚠️ מוגבל | ✅ גמיש מאוד |
| Cost | 💰 יקר בסקייל גבוה | 💰 זול יותר |

---

## 📞 תמיכה

יש בעיה? בדוק:
1. Firebase Console → Project Overview (בדוק שהפרויקט פעיל)
2. Firestore Database → Data (בדוק ש-collections נוצרות)
3. Backend logs (הרץ `npm run dev` ובדוק שגיאות)

---

## ✨ שינויים עיקריים מ-MongoDB

1. **אין Mongoose Schemas** - יש Firestore Models
2. **אין Validation בDB** - Validation בקוד
3. **אין Populate** - צריך לעשות joins ידנית
4. **אין Transactions** (כרגע) - ניתן להוסיף
5. **Real-time בחינם!** - ניתן להוסיף listeners

---

🎉 **המערכת מוכנה לעבודה עם Firebase!**
