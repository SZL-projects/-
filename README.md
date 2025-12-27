# מערכת CRM לניהול יחידת האופנועים

## תיאור הפרויקט
מערכת ניהול מקיפה ליחידת אופנועים הכוללת:
- ניהול רוכבים וכלים
- מעקב אחר תקלות וטיפולים
- בקרה חודשית אוטומטית
- ניהול ציוד ומלאי
- מעקב תוקפי ביטוחים ורישיונות
- מערכת משימות והתראות
- Audit Trail מלא

## טכנולוגיות
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Frontend**: React + Material-UI
- **Authentication**: JWT
- **File Storage**: Multer + Local/Cloud Storage
- **Scheduler**: node-cron (לבקרה חודשית)

## מבנה הפרויקט
```
├── backend/              # שרת Node.js
│   ├── models/          # מודלי נתונים
│   ├── routes/          # API endpoints
│   ├── middleware/      # Authentication, validation
│   ├── services/        # Business logic
│   ├── uploads/         # קבצים שהועלו
│   └── config/          # הגדרות
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # קומפוננטות
│   │   ├── pages/       # עמודים
│   │   ├── services/    # API calls
│   │   └── utils/       # עזרים
└── docs/                # תיעוד

```

## התקנה והרצה

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## גרסה
3.13 - מאוחד ומתוקן (כולל שינויי דצמבר)

## מפתח
שלמה זלמן לרנר - מזכיר יחידת האופנועים
