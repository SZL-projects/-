# Schedulers

תיקייה זו מכילה משימות אוטומטיות (Cron Jobs) שרצות ברקע בסביבת Development.

## 📋 רשימת Schedulers

### 1. Monthly Check Scheduler
**קובץ:** `monthlyCheckScheduler.js`
**תדירות:** ב-1 לכל חודש בשעה 00:00 (חצות)
**תיאור:** פותח בקרות חודשיות אוטומטיות לכל הרוכבים הפעילים שמשויכים לכלים.

#### איך זה עובד:
1. בוחן את כל הרוכבים עם סטטוס `active`
2. בודק שהרוכב משויך לכלי (`assignmentStatus === 'assigned'`)
3. בודק שהכלי פעיל (`vehicleStatus === 'active'`)
4. יוצר בקרה חודשית חדשה עם סטטוס `pending`
5. מוודא שלא נוצרת בקרה כפולה לאותו חודש

#### Cron Expression:
```
'0 0 1 * *'
```
- דקה: 0
- שעה: 0 (חצות)
- יום בחודש: 1 (ראשון לחודש)
- חודש: * (כל חודש)
- יום בשבוע: * (לא משנה)

#### אזור זמן:
```javascript
timezone: "Asia/Jerusalem"
```

## 🚀 איך להפעיל

### הפעלה אוטומטית
ה-Scheduler מופעל אוטומטית כשהשרת עולה ב-Development mode:

```javascript
// backend/server-firebase.js
if (process.env.NODE_ENV !== 'production') {
  const monthlyCheckScheduler = require('./schedulers/monthlyCheckScheduler');
  monthlyCheckScheduler.start();
}
```

### הרצה ידנית (לבדיקות)
ניתן להריץ את הפתיחה של בקרות חודשיות באופן ידני:

#### דרך 1: API Endpoint
```bash
POST http://localhost:5000/api/admin/trigger-monthly-checks
```

#### דרך 2: הרצה בקוד
```javascript
const monthlyCheckScheduler = require('./schedulers/monthlyCheckScheduler');
await monthlyCheckScheduler.runNow();
```

#### דרך 3: משתנה סביבה
הוסף ל-`.env`:
```
ENABLE_SCHEDULER_ON_START=true
```
זה יריץ את ה-Scheduler מיד כשהשרת עולה (בנוסף לטיימר החודשי).

## ⚙️ הגדרות

### משתני סביבה רלוונטיים:
- `NODE_ENV` - אם שווה ל-`production`, ה-Schedulers לא יפעלו (Vercel Serverless)
- `ENABLE_SCHEDULER_ON_START` - אם `true`, יריץ את הפתיחה של בקרות מיידית בהפעלה

## 📝 לוגים

ה-Scheduler מדפיס לוגים מפורטים:

```
🔄 מתחיל פתיחת בקרות חודשיות לחודש 1/2026...
📋 נמצאו 15 רוכבים פעילים
✅ בקרה חודשית נוצרה עבור ישראל ישראלי (12-345-67)
⏭️ רוכב דוד כהן אינו משויך לכלי - מדלג
⏭️ כלי 89-123-45 אינו פעיל - מדלג

✅ סיכום פתיחת בקרות חודשיות לחודש 1/2026:
   - נוצרו: 12 בקרות
   - דולגו: 3 רוכבים
   - שגיאות: 0
```

## 🔒 אבטחה

- ה-Schedulers רצים **רק ב-Development mode** (לא ב-Vercel Production)
- נתיב ה-API הידני זמין רק ב-Development
- בעתיד ניתן להוסיף אימות למנהלי-על בלבד

## 🛠️ פיתוח Schedulers חדשים

כדי להוסיף Scheduler חדש:

1. צור קובץ חדש בתיקייה `schedulers/`
2. יישם את ה-pattern:
```javascript
const cron = require('node-cron');
const { db } = require('../config/firebase');

class MyScheduler {
  constructor() {
    this.job = null;
  }

  async doWork() {
    // הלוגיקה שלך כאן
  }

  start() {
    this.job = cron.schedule('0 0 * * *', () => {
      this.doWork();
    }, {
      timezone: "Asia/Jerusalem"
    });
  }

  stop() {
    if (this.job) {
      this.job.stop();
    }
  }
}

module.exports = new MyScheduler();
```

3. הוסף ל-`server-firebase.js`:
```javascript
if (process.env.NODE_ENV !== 'production') {
  require('./schedulers/myScheduler').start();
}
```

## 📚 משאבים

- [node-cron documentation](https://github.com/node-cron/node-cron)
- [Crontab.guru](https://crontab.guru/) - עזרה ב-Cron expressions
- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)

## ⚠️ הערות חשובות

1. **Vercel Serverless**: ב-Vercel, functions הן serverless ולא יכולות להריץ cron jobs מתמשכים. לכן ה-Schedulers מופעלים **רק ב-Development**.
2. **Production**: בעתיד ניתן להשתמש ב-Vercel Cron Jobs, Cloud Functions, או שירות חיצוני כמו GitHub Actions.
3. **בדיקות**: תמיד בדוק את הלוגיקה באמצעות ההרצה הידנית לפני שמסתמכים על הטיימר האוטומטי.
