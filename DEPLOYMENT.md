# 🚀 הוראות פריסה ל-Vercel

## ⚠️ חשוב - משתני סביבה נדרשים

לפני הפריסה, יש להגדיר את משתני הסביבה הבאים ב-Vercel Dashboard:

### צעדים:
1. היכנס ל-Vercel Dashboard
2. בחר את הפרויקט
3. לך ל-Settings → Environment Variables
4. הוסף את המשתנים הבאים:

### משתני סביבה חובה:

```
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-secret-key>
JWT_EXPIRE=30d
NODE_ENV=production
PORT=5000
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
MONTHLY_CHECK_DAY=1
MONTHLY_CHECK_HOUR=9
KM_ANOMALY_THRESHOLD=2000
```

---

## 📝 הגדרת MongoDB Atlas (מומלץ לפרודקשן)

1. **צור חשבון חינם ב-MongoDB Atlas:**
   - https://www.mongodb.com/cloud/atlas/register

2. **צור Cluster חדש:**
   - בחר Free Tier (M0)
   - בחר אזור קרוב (למשל Frankfurt)

3. **הגדר Database Access:**
   - Database Access → Add New Database User
   - שמור שם משתמש וסיסמה

4. **הגדר Network Access:**
   - Network Access → Add IP Address
   - בחר "Allow Access from Anywhere" (0.0.0.0/0)

5. **קבל Connection String:**
   - Clusters → Connect → Connect your application
   - העתק את ה-connection string
   - החלף `<password>` בסיסמה שיצרת
   - דוגמה: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/motorcycle-crm?retryWrites=true&w=majority`

6. **הוסף ל-Vercel:**
   - Vercel → Settings → Environment Variables
   - שם: `MONGODB_URI`
   - ערך: ה-connection string שלך

---

## 🔐 הגדרת JWT Secret

צור מפתח חזק ל-JWT:

```bash
# באמצעות Node.js:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# או באמצעות OpenSSL:
openssl rand -hex 64
```

הוסף את התוצאה כ-`JWT_SECRET` ב-Vercel.

---

## ✅ לאחר הפריסה

### בדיקת תקינות:
```
https://your-app.vercel.app/health
```

אמור להחזיר:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "..."
}
```

### יצירת משתמש ראשון (מנהל-על):
```bash
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@motorcycle-unit.com",
    "password": "YourStrongPassword123!",
    "firstName": "שלמה זלמן",
    "lastName": "לרנר",
    "phone": "0501234567",
    "role": "super_admin"
  }'
```

---

## 🔄 עדכון אוטומטי

כל push ל-branch main יפעיל deployment אוטומטי ב-Vercel.

---

## ⚠️ בעיות נפוצות

### שגיאה: Cannot connect to MongoDB
- ודא ש-`MONGODB_URI` מוגדר נכון
- בדוק ש-IP של Vercel מורשה ב-MongoDB Atlas (0.0.0.0/0)

### שגיאה: JWT Error
- ודא ש-`JWT_SECRET` מוגדר
- ודא שהמפתח ארוך מספיק (מינימום 32 תווים)

---

## 📞 תמיכה

לבעיות בפריסה, פנה למפתח:
שלמה זלמן לרנר - מזכיר צי לוג ידידים
