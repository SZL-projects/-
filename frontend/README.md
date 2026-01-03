# Frontend - מערכת CRM צי לוג ידידים

ממשק משתמש מודרני ומעוצב למערכת CRM.

## 🎨 תכונות

- ✅ עיצוב מודרני עם Material-UI
- ✅ תמיכה מלאה בעברית (RTL)
- ✅ מסך התחברות מעוצב
- ✅ דשבורד עם סטטיסטיקות
- ✅ ניהול רוכבים (טבלה + חיפוש)
- ✅ ניהול כלים (טבלה + חיפוש)
- ✅ Responsive (מתאים למובייל)
- ✅ Authentication עם JWT

## 🚀 התקנה והרצה

### התקנת חבילות
```bash
npm install
```

### הרצה במצב פיתוח
```bash
npm run dev
```

הדפדפן ייפתח ב: http://localhost:3000

### בניה לפרודקשן
```bash
npm run build
```

## 📂 מבנה הפרויקט

```
frontend/
├── src/
│   ├── components/      # קומפוננטות משותפות
│   │   └── Layout.jsx  # תפריט צד ו-AppBar
│   ├── contexts/        # React Context
│   │   └── AuthContext.jsx
│   ├── pages/           # עמודים
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Riders.jsx
│   │   └── Vehicles.jsx
│   ├── services/        # קריאות API
│   │   └── api.js
│   ├── App.jsx          # נקודת כניסה ראשית
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

## 🔌 חיבור ל-Backend

ערוך את `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

לפרודקשן:
```
VITE_API_URL=https://your-backend.vercel.app/api
```

## 👤 משתמש ברירת מחדל

אחרי שתריץ את ה-Backend ותיצור משתמש:
- שם משתמש: `admin`
- סיסמה: `Admin123!`

## 📱 מסכים זמינים

1. **Login** - מסך התחברות
2. **Dashboard** - דשבורד עם סטטיסטיקות
3. **Riders** - ניהול רוכבים
4. **Vehicles** - ניהול כלים
5. **Tasks** - משימות (בקרוב)
6. **Monthly Checks** - בקרה חודשית (בקרוב)
7. **Faults** - תקלות (בקרוב)
8. **Reports** - דוחות (בקרוב)

## 🎨 עיצוב

- Material-UI v5
- Theme מותאם לעברית (RTL)
- צבעים: כחול (#1976d2) ואדום (#dc004e)
- Responsive Design

## ⚙️ טכנולוגיות

- React 18
- Vite (מהיר מ-CRA!)
- React Router v6
- Material-UI v5
- Axios
- Context API

## 🔧 פתרון בעיות

### Backend לא מגיב
ודא ש-Backend רץ על `http://localhost:5000`

### שגיאת CORS
Backend כבר מוגדר עם CORS - אמור לעבוד

### לא מצליח להתחבר
ודא שיצרת משתמש ב-Backend תחילה

## 📦 Build

```bash
npm run build
```

הקבצים יהיו ב-`dist/`

## 🚀 Deploy ל-Vercel

```bash
# התקן Vercel CLI
npm i -g vercel

# Deploy
vercel
```

---

גרסה: 3.13.0
