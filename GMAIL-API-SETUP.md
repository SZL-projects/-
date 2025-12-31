# הוראות הגדרת Gmail API עם Domain-Wide Delegation

## למנהל מערכת Google Workspace של ארגון ידידים

מסמך זה מסביר כיצד להגדיר את המערכת כך שה-Service Account יוכל לשלוח מיילים מטעם bikes@yedidim-il.org.

---

## למה זה נחוץ?

כרגע המערכת משתמשת ב-SMTP עם IP ישיר לשליחת מיילים. זה עובד אבל לא יציב לטווח ארוך.
Gmail API הוא הפתרון המומלץ של גוגל לשליחת מיילים משרת - הוא מהיר, יציב, ומאובטח יותר.

כדי שה-Service Account יוכל לשלוח מיילים מטעם bikes@yedidim-il.org, צריך להגדיר **Domain-Wide Delegation**.

---

## שלב 1: כניסה ל-Google Workspace Admin Console

1. היכנס ל: https://admin.google.com
2. התחבר עם משתמש שיש לו הרשאות אדמין ב-Google Workspace

---

## שלב 2: הוספת Service Account ל-Domain-Wide Delegation

1. בתפריט הצד, לחץ על **Security** (אבטחה)
2. גלול למטה ולחץ על **API Controls** (בקרת API)
3. לחץ על **MANAGE DOMAIN WIDE DELEGATION** (ניהול האצלה ברחבי הדומיין)
4. לחץ על **Add new** (הוסף חדש)

---

## שלב 3: הזנת פרטי ה-Service Account

הזן את הפרטים הבאים:

### Client ID:
```
103862461703489096116
```

### OAuth Scopes:
```
https://www.googleapis.com/auth/gmail.send
```

**הסבר:**
- **Client ID** - זה המזהה של ה-Service Account שלנו
- **OAuth Scope** - זו ההרשאה הספציפית שאנחנו צריכים (רק שליחת מיילים, שום דבר אחר)

---

## שלב 4: אישור והשלמת ההגדרה

1. לחץ על **Authorize** (אשר)
2. ודא שההגדרה נשמרה

---

## בדיקה שזה עובד

לאחר ההגדרה:
1. המפתח ישלח הודעה למפתח שההגדרה הושלמה
2. הוא יעדכן את הקובץ `api/auth.js` לשימוש ב-Gmail API
3. יפרסם מחדש את האפליקציה ל-Vercel
4. יבדוק שליחת מייל לאיפוס סיסמה

---

## שאלות נפוצות

### האם זה בטוח?
כן! ה-Service Account יכול רק **לשלוח** מיילים מטעם bikes@yedidim-il.org.
הוא לא יכול לקרוא מיילים, למחוק, או לעשות שום דבר אחר.
ההרשאה מוגבלת רק ל-`gmail.send`.

### האם אפשר לבטל את זה?
כן! בכל עת ניתן לחזור ל-Google Workspace Admin Console ולהסיר את ההרשאה.

### איך אני יודע שזה עובד?
המפתח יבדוק ויעדכן אותך. תוכל גם לראות את המיילים היוצאים ב-Gmail Sent folder.

---

## מידע טכני נוסף

**Service Account Email:**
```
firebase-adminsdk-6ogkh@motorcycle-project-8a680.iam.gserviceaccount.com
```

**Google Cloud Project:**
```
motorcycle-project-8a680
```

**מייל ארגוני שממנו נשלחים המיילים:**
```
bikes@yedidim-il.org
```

---

## צור קשר

אם יש שאלות או בעיות, ניתן ליצור קשר עם המפתח.

תאריך יצירת המסמך: 30/12/2025
