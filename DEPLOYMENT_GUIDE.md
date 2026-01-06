# מדריך התקנה ופריסה - מערכת CRM צי לוג ידידים

## 📋 סיכום השינויים שבוצעו

הפרויקט עודכן עם אינטגרציה מלאה של Google Drive ו-Gmail API, כולל:

✅ **Google Drive OAuth2** - העלאת קבצים לכל כלי רכב
✅ **Gmail API** - שליחת מיילים אוטומטיים
✅ **רענון טוקנים אוטומטי** - 5 דקות לפני פקיעה
✅ **תמיכה בשמות קבצים עבריים** - קידוד UTF-8 מלא
✅ **UI ניהול** - ממשק הגדרות לחיבור חשבון Google
✅ **עדכון לדומיין החדש** - `tzi-log-yedidim.vercel.app`

---

## 🔧 שלב 1: הוספת משתני סביבה ב-Vercel

יש להוסיף את כל 12 משתני הסביבה הבאים ב-Vercel:

**⚠️ הערה חשובה:**
המשתנים האמיתיים נמצאים כבר ב-Vercel Dashboard של הפרויקט.
להלן רשימת המשתנים הנדרשים (ללא הערכים האמיתיים מסיבות אבטחה):

### 1️⃣ Firebase Configuration (6 משתנים)

```bash
FIREBASE_API_KEY=<הערך נמצא ב-Vercel>
FIREBASE_AUTH_DOMAIN=motorcycle-crm.firebaseapp.com
FIREBASE_PROJECT_ID=motorcycle-crm
FIREBASE_STORAGE_BUCKET=motorcycle-crm.appspot.com
FIREBASE_MESSAGING_SENDER_ID=<הערך נמצא ב-Vercel>
FIREBASE_APP_ID=<הערך נמצא ב-Vercel>
```

### 2️⃣ Firebase Service Account Key (1 משתנה)

**חשוב מאוד:** זהו קובץ JSON שלם שצריך להיות במשתנה אחד!

```bash
FIREBASE_SERVICE_ACCOUNT_KEY=<קובץ JSON מלא - נמצא ב-Vercel או בקובץ Downloads/motorcycle-crm-*.json>
```

הקובץ נמצא ב: `D:\דור 10 כל המחשב\Downloads\motorcycle-crm-b572b8d8e7c2.json`

### 3️⃣ Google OAuth2 Configuration (3 משתנים)

```bash
GOOGLE_OAUTH_CLIENT_ID=<הערך נמצא ב-Vercel>
GOOGLE_OAUTH_CLIENT_SECRET=<הערך נמצא ב-Vercel>
GOOGLE_REDIRECT_URI=https://tzi-log-yedidim.vercel.app/api/drive/oauth2callback
```

### 4️⃣ Google Drive Root Folder (1 משתנה)

```bash
GOOGLE_DRIVE_ROOT_FOLDER_ID=<הערך נמצא ב-Vercel>
```

### 5️⃣ JWT Secret (1 משתנה)

```bash
JWT_SECRET=<הערך נמצא ב-Vercel>
```

---

## 📌 איך להוסיף משתני סביבה ב-Vercel?

1. היכנס ל-Vercel Dashboard: https://vercel.com/dashboard
2. בחר את הפרויקט `tzi-log-yedidim`
3. לחץ על **Settings**
4. בתפריט צד שמאל, לחץ על **Environment Variables**
5. עבור כל משתנה:
   - שדה **Key**: שם המשתנה (לדוגמה: `FIREBASE_API_KEY`)
   - שדה **Value**: הערך (העתק מ-Vercel Dashboard הקיים)
   - בחר **All Environments** (Production, Preview, Development)
   - לחץ **Save**

**⚠️ שים לב:**
- `FIREBASE_SERVICE_ACCOUNT_KEY` צריך להיות כל ה-JSON בשורה אחת (כפי שמופיע למעלה)
- אל תוסיף רווחים או שורות חדשות למשתנים

---

## 🔐 שלב 2: עדכון Google Cloud Console

יש לעדכן את ה-Redirect URI ב-Google Cloud Console כדי לתמוך בדומיין החדש.

### צעדים:

1. היכנס ל-Google Cloud Console: https://console.cloud.google.com
2. בחר את הפרויקט: **motorcycle-crm**
3. עבור אל: **APIs & Services** → **Credentials**
4. מצא את ה-OAuth 2.0 Client ID שלך (Client ID: `194526141872-guu8mn3i4op0bqqqcui80s5f6calnkkg...`)
5. לחץ על Edit (עריכה)
6. בחלק **Authorized redirect URIs**, הוסף:
   ```
   https://tzi-log-yedidim.vercel.app/api/drive/oauth2callback
   ```
7. **אופציונלי:** אם אתה רוצה לשמור גם את הדומיין הישן לזמן מה, אל תמחק את:
   ```
   https://seven-roan-19.vercel.app/api/drive/oauth2callback
   ```
8. לחץ **Save** (שמירה)

---

## 🚀 שלב 3: Redeploy הפרויקט ב-Vercel

אחרי הוספת כל משתני הסביבה, יש לעשות Redeploy:

1. היכנס ל-Vercel Dashboard
2. עבור ל-**Deployments**
3. לחץ על ה-Deployment האחרון
4. לחץ על כפתור **...** (שלוש נקודות) → **Redeploy**
5. בחר **Use existing Build Cache** או **Redeploy from scratch**
6. לחץ **Redeploy**

**חלופה מהקוד המקומי:**

אם יש לך את הקוד במחשב המקומי, תוכל גם לעשות:

```bash
cd "D:\דור 10 כל המחשב\Desktop\פריקט אופנועים"
git add .
git commit -m "עדכון לדומיין החדש tzi-log-yedidim.vercel.app"
git push
```

Vercel יעשה Deploy אוטומטית אחרי ה-Push.

---

## ✅ שלב 4: בדיקת המערכת

אחרי ה-Deploy, בצע את הבדיקות הבאות:

### 1️⃣ בדיקת חיבור Google Account

1. היכנס למערכת: https://tzi-log-yedidim.vercel.app
2. התחבר עם משתמש **super_admin**
3. עבור לדף **הגדרות** (Settings)
4. תראה כרטיס "חשבון Google"
5. לחץ על **"התחבר לחשבון Google"**
6. יפתח חלון OAuth של Google
7. התחבר עם חשבון Google שלך
8. תן הרשאות ל-Drive ו-Gmail
9. החלון ייסגר אוטומטית
10. תראה הודעה: **"Google Drive מחובר בהצלחה!"**
11. הסטטוס ישתנה ל-**"מחובר"** עם V ירוק

### 2️⃣ בדיקת העלאת קובץ עם שם עברי

1. עבור לדף **כלים** (Vehicles)
2. בחר כלי קיים או צור חדש
3. לחץ על **"העלה קובץ"**
4. העלה קובץ עם שם עברי, לדוגמה: **"ביטוח_2026.pdf"**
5. וודא שהקובץ מופיע ב-Google Drive עם השם העברי המקורי
6. לחץ על הקישור לקובץ ב-Drive - צריך להיפתח ב-Google Drive

### 3️⃣ בדיקת רענון טוקן אוטומטי

1. חכה שעה (או שנה את השעה במחשב בעוד 5 דקות)
2. עבור שוב לדף **הגדרות**
3. לחץ **"רענן סטטוס"**
4. הטוקן אמור להתרענן אוטומטית בלי צורך באימות מחדש
5. בדוק ב-Console של הדפדפן (F12) - אמור להיות לוג:
   ```
   Gmail: Access token refreshed successfully
   ```

---

## 🧪 בדיקות נוספות (אופציונליות)

### בדיקת Gmail API (עדיין לא מחובר לממשק)

ניתן לבדוק ידנית דרך Vercel Functions או הקוד:

```javascript
// דוגמה לשליחת מייל דרך gmailService
const gmailService = require('./services/gmailService');

await gmailService.sendWelcomeEmail(
  'test@example.com',
  'שם הרוכב',
  'https://tzi-log-yedidim.vercel.app'
);
```

---

## 📂 קבצים שעודכנו בפרויקט

### Backend (API):

1. **`api/drive.js`** - OAuth2 flow עם Gmail scope
2. **`api/services/googleDriveService.js`** - רענון טוקן אוטומטי + עדכון דומיין
3. **`api/services/gmailService.js`** - שירות Gmail + עדכון דומיין
4. **`api/vehicles.js`** - תיקון קידוד עברית בשמות קבצים
5. **`api/_utils/firebase.js`** - שימוש ב-Service Account Key מ-ENV
6. **`api/_utils/auth.js`** - JWT authentication

### Frontend (React):

1. **`frontend/src/pages/Settings.jsx`** - ממשק ניהול חשבון Google
2. **`frontend/src/utils/dateUtils.js`** - פונקציות עזר להמרת תאריכים מ-Firestore
3. **`frontend/public/sw.js`** - Service Worker (תיקון caching של POST)

---

## 🔍 פתרון בעיות (Troubleshooting)

### ❌ שגיאה: "Missing required parameter: client_id"

**פתרון:**
- וודא שהוספת את `GOOGLE_OAUTH_CLIENT_ID` ו-`GOOGLE_OAUTH_CLIENT_SECRET` ב-Vercel
- עשה Redeploy אחרי הוספת המשתנים

### ❌ שגיאה: "redirect_uri_mismatch"

**פתרון:**
- וודא שעדכנת את ה-Redirect URI ב-Google Cloud Console
- ה-URI חייב להיות בדיוק: `https://tzi-log-yedidim.vercel.app/api/drive/oauth2callback`
- **שים לב:** אין `/` בסוף!

### ❌ שגיאה: "Google Drive לא מאומת"

**פתרון:**
- זה אומר שעדיין לא התחברת דרך ממשק ההגדרות
- עבור לדף הגדרות ולחץ "התחבר לחשבון Google"

### ❌ הטוקן פג תוקף כל שעה

**פתרון:**
- וודא שבקוד ה-OAuth flow יש `prompt: 'consent'` (קיים)
- זה יבטיח שתקבל `refresh_token` שיאפשר רענון אוטומטי
- אם זה קורה, נתק את החיבור בהגדרות והתחבר מחדש

### ❌ קבצים עם שמות עבריים מוצגים עם תווים משובשים

**פתרון:**
- הקוד כבר מתקן את זה ב-`vehicles.js:119`
- אם זה עדיין קורה, נסה להעלות קובץ מחדש אחרי ה-Deploy החדש

---

## 📝 הערות חשובות

1. **Service Account Key:**
   - קובץ ה-JSON הזה מאוד רגיש! שמור אותו במקום מאובטח
   - לעולם אל תעלה אותו ל-Git
   - הוא כבר במשתני הסביבה של Vercel

2. **OAuth2 Tokens:**
   - הטוקנים נשמרים ב-Firestore במסד `settings/googleDrive`
   - הם מתרעננים אוטומטית כל 55 דקות (5 דקות לפני פקיעה)
   - אם יש בעיה, תוכל למחוק את המסמך `settings/googleDrive` ב-Firestore ולהתחבר מחדש

3. **Root Folder:**
   - כל התיקיות של הכלים נוצרות בתוך התיקייה:
     `https://drive.google.com/drive/folders/186mat7V_XgO02xkmIqjQXeZDs26S1SFY`
   - אם אתה רוצה לשנות את התיקייה, עדכן את `GOOGLE_DRIVE_ROOT_FOLDER_ID`

4. **Gmail Scopes:**
   - הפרויקט כבר מבקש הרשאת `gmail.send`
   - זה מאפשר שליחת מיילים אבל לא קריאה
   - אם תרצה גם לקרוא מיילים בעתיד, צריך להוסיף scope נוסף

---

## 🎯 מה הלאה?

השלבים הבאים שניתן להוסיף (לא כלול כרגע):

- [ ] שליחת מייל ברוכים הבאים אוטומטי בעת יצירת משתמש חדש
- [ ] שליחת מייל איפוס סיסמה
- [ ] שליחת תזכורות לרוכבים על תאריכים חשובים (ביטוח, בדק)
- [ ] התראות אוטומטיות למנהל על אירועים במערכת
- [ ] סנכרון עם Google Calendar לתזכורות

---

## 📞 תמיכה

אם נתקלת בבעיות:

1. בדוק את ה-Logs ב-Vercel Dashboard → Deployment → View Function Logs
2. בדוק את הקונסול בדפדפן (F12 → Console)
3. וודא שכל משתני הסביבה נוספו נכון
4. נסה לעשות Redeploy

---

✅ **מערכת מוכנה לפריסה!**

כל הקוד מעודכן ומוכן. צריך רק להוסיף את משתני הסביבה, לעדכן את Google Cloud Console, ולעשות Redeploy.
