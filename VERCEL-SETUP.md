# הגדרת Backend ב-Vercel

## שלב 1: העלאת הקוד
הקוד כבר הועלה ל-Git ו-Vercel יבנה אותו אוטומטית.

## שלב 2: הגדרת משתני סביבה ב-Vercel Dashboard

יש להיכנס ל-Vercel Dashboard ולהגדיר את משתני הסביבה הבאים:

### 1. כנס ל-Vercel Dashboard:
https://vercel.com/dashboard

### 2. בחר את הפרויקט שלך

### 3. לחץ על Settings > Environment Variables

### 4. הוסף את המשתנים הבאים:

**FIREBASE_SERVICE_ACCOUNT_KEY** (סוג: Secret)

הקובץ serviceAccountKey.json נמצא במחשב שלך בתיקיית backend.
העתק את תוכן הקובץ כולו (כל ה-JSON) בשורה אחת - ללא רווחים או שורות חדשות.

**איך להמיר ל-JSON בשורה אחת:**
1. פתח את הקובץ `backend/serviceAccountKey.json`
2. העתק את כל התוכן
3. הדבק בכלי JSON minifier או פשוט הסר את כל שורות החדשות
4. הדבק ב-Vercel

**משתנים נוספים:**

- `JWT_SECRET` = `motorcycle-crm-secret-key-change-in-production-2024`
- `JWT_EXPIRE` = `30d`
- `NODE_ENV` = `production`
- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `587`
- `SMTP_SECURE` = `false`
- `SMTP_USER` = `bikes@yedidim-il.org`
- `SMTP_PASS` = (העתק מקובץ .env המקומי)
- `FROM_EMAIL` = `bikes@yedidim-il.org`
- `FROM_NAME` = `מערכת CRM יחידת האופנועים`

### 5. שמור את ההגדרות

### 6. Redeploy
לאחר הוספת משתני הסביבה, Vercel יבנה מחדש את הפרויקט אוטומטית.

## בדיקה
לאחר ה-deployment, בדוק ש:
1. האתר נטען
2. ניתן להתחבר עם `admin` / `Admin123!`
3. ניתן להוסיף רוכבים, משימות, תקלות
