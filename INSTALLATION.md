# 📋 הוראות התקנה והרצה - מערכת CRM יחידת האופנועים

## דרישות מקדימות

לפני התחלת ההתקנה, וודא שמותקנים במחשב:

1. **Node.js** (גרסה 18 ומעלה)
   - הורד מ: https://nodejs.org/
   - בדוק התקנה: `node --version`

2. **MongoDB** (גרסה 6 ומעלה)
   - הורד מ: https://www.mongodb.com/try/download/community
   - בדוק התקנה: `mongod --version`

3. **Git** (אופציונלי)
   - הורד מ: https://git-scm.com/

---

## 🚀 שלבי ההתקנה

### שלב 1: התקנת חבילות Backend

```bash
# עבור לתיקיית backend
cd "D:\דור 10 כל המחשב\Desktop\פריקט אופנועים\backend"

# התקנת כל החבילות הנדרשות
npm install
```

### שלב 2: הפעלת MongoDB

**אופציה א': הרצת MongoDB מקומית**
```bash
# פתח CMD חדש והרץ:
mongod
```

**אופציה ב': שימוש ב-MongoDB Atlas (ענן)**
1. צור חשבון ב: https://www.mongodb.com/cloud/atlas
2. צור Cluster חדש (בחר Free Tier)
3. קבל את ה-Connection String
4. עדכן את `MONGODB_URI` בקובץ `.env`

### שלב 3: בדיקת קובץ .env

ודא שקובץ `.env` נמצא בתיקיית `backend` ומכיל את ההגדרות הנכונות:

```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/motorcycle-crm
JWT_SECRET=motorcycle-crm-secret-key-change-in-production-2024
JWT_EXPIRE=30d
```

### שלב 4: הרצת השרת

```bash
# מתיקיית backend:
npm run dev
```

אם הכל תקין, תראה הודעה:
```
╔═══════════════════════════════════════════════════╗
║   🏍️  מערכת CRM - יחידת האופנועים  🏍️           ║
║   Server running in development mode             ║
║   Port: 5000                                      ║
╚═══════════════════════════════════════════════════╝
```

---

## ✅ בדיקת תקינות

### בדיקה 1: בריאות השרת
פתח דפדפן וגש ל:
```
http://localhost:5000/health
```

תקבל תגובה:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "..."
}
```

### בדיקה 2: יצירת משתמש ראשון (מנהל-על)

שלח בקשת POST ל: `http://localhost:5000/api/auth/register`

**באמצעות Postman/Insomnia:**
```json
{
  "username": "admin",
  "email": "admin@motorcycle-unit.com",
  "password": "Admin123!",
  "firstName": "שלמה זלמן",
  "lastName": "לרנר",
  "phone": "0501234567",
  "role": "super_admin"
}
```

**באמצעות curl (CMD):**
```bash
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"email\":\"admin@motorcycle-unit.com\",\"password\":\"Admin123!\",\"firstName\":\"שלמה זלמן\",\"lastName\":\"לרנר\",\"phone\":\"0501234567\",\"role\":\"super_admin\"}"
```

תקבל תגובה עם token:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "admin",
    "role": "super_admin"
  }
}
```

### בדיקה 3: התחברות

POST ל: `http://localhost:5000/api/auth/login`
```json
{
  "username": "admin",
  "password": "Admin123!"
}
```

---

## 🛠️ פתרון בעיות נפוצות

### שגיאה: "Cannot connect to MongoDB"
- ודא ש-MongoDB רץ (הרץ `mongod`)
- בדוק את `MONGODB_URI` בקובץ `.env`

### שגיאה: "Port 5000 is already in use"
- שנה את `PORT` בקובץ `.env` לערך אחר (למשל 5001)
- או סגור תהליכים אחרים שמשתמשים בפורט 5000

### שגיאה: "Module not found"
- הרץ שוב `npm install` בתיקיית backend

---

## 📝 API Endpoints זמינים

### אימות
- `POST /api/auth/register` - רישום משתמש חדש
- `POST /api/auth/login` - התחברות
- `GET /api/auth/me` - פרטי משתמש מחובר (דורש token)

### רוכבים
- `GET /api/riders` - רשימת רוכבים
- `GET /api/riders/:id` - רוכב ספציפי
- `POST /api/riders` - יצירת רוכב (מנהלים בלבד)
- `PUT /api/riders/:id` - עדכון רוכב (מנהלים בלבד)
- `DELETE /api/riders/:id` - מחיקת רוכב (מנהל-על בלבד)

### כלים
- `GET /api/vehicles` - רשימת כלים
- `GET /api/vehicles/:id` - כלי ספציפי
- `POST /api/vehicles` - יצירת כלי (מנהלים בלבד)
- `PUT /api/vehicles/:id` - עדכון כלי (מנהלים בלבד)
- `DELETE /api/vehicles/:id` - מחיקת כלי (מנהל-על בלבד)

---

## 🔐 שימוש ב-Token

לאחר התחברות, תקבל token. השתמש בו בכל בקשה:

**Header:**
```
Authorization: Bearer <token>
```

**דוגמה ב-curl:**
```bash
curl -X GET http://localhost:5000/api/riders ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📞 תמיכה

אם נתקלת בבעיות, פנה למפתח:
שלמה זלמן לרנר - מזכיר יחידת האופנועים

---

## ✨ שלבים הבאים

1. ✅ Backend בסיסי - **הושלם**
2. ⏳ Frontend (React) - בתהליך
3. ⏳ מודול בקרה חודשית
4. ⏳ מודול תקלות וטיפולים
5. ⏳ מערכת העלאת קבצים
6. ⏳ דוחות ו-Dashboard
