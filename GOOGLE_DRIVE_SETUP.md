# הוראות הגדרת Google Drive API

## שלב 1: יצירת Google Cloud Project

1
היכנס ל:
https://console.cloud.google.com/

2
לחץ על
Create Project

3
שם הפרויקט:
Motorcycle CRM

4
לחץ על
Create

## שלב 2: הפעלת Google Drive API

1
בתפריט הצד, לחץ על:
APIs & Services > Library

2
חפש:
Google Drive API

3
לחץ על
Google Drive API

4
לחץ על
ENABLE

## שלב 3: יצירת Service Account

1
בתפריט הצד, לחץ על:
APIs & Services > Credentials

2
לחץ על:
Create Credentials > Service Account

3
מלא:
- Service Account Name: motorcycle-crm-drive
- Description: Service account for CRM file management

4
לחץ על
CREATE AND CONTINUE

5
בשלב
Grant this service account access to project
בחר תפקיד:
Editor

6
לחץ על
CONTINUE
ואז
DONE

## שלב 4: יצירת JSON Key

1
במסך
Credentials
תראה את ה-Service Account
שיצרת

2
לחץ על שם ה-Service Account

3
עבור לטאב
KEYS

4
לחץ על:
ADD KEY > Create new key

5
בחר
JSON

6
לחץ על
CREATE

7
הקובץ
JSON
יורד אוטומטית למחשב שלך

## שלב 5: שיתוף Google Drive עם Service Account

1
פתח את קובץ ה-JSON
שהורדת

2
העתק את כתובת ה-email
שנמצאת בשדה
client_email

הוא נראה כך:
motorcycle-crm-drive@project-id.iam.gserviceaccount.com

3
פתח את
Google Drive
שלך:
https://drive.google.com/

4
צור תיקייה חדשה בשם:
CRM Motorcycle Files

5
לחץ ימני על התיקייה > Share

6
הדבק את כתובת ה-email
מהשלב 2

7
תן הרשאות:
Editor

8
לחץ
Share

9
העתק את ה-ID
של התיקייה מה-URL:
https://drive.google.com/drive/folders/[THIS_IS_THE_FOLDER_ID]

## שלב 6: הגדרת משתני סביבה ב-Vercel

1
פתח את
Vercel Dashboard

2
בחר בפרויקט שלך

3
לך ל:
Settings > Environment Variables

4
הוסף משתנה:
GOOGLE_DRIVE_SERVICE_ACCOUNT

ערך:
פתח את קובץ ה-JSON
והעתק את כל התוכן
(זהה למה שעשית עם FIREBASE_SERVICE_ACCOUNT_KEY)

5
הוסף משתנה:
GOOGLE_DRIVE_FOLDER_ID

ערך:
ה-ID
של התיקייה שיצרת בשלב 5.9

6
לחץ
Save

## סיימת!

עכשיו המערכת שלך יכולה להעלות ולנהל קבצים ב-Drive
שלך.

המבנה יהיה:
```
CRM Motorcycle Files/
  כלים/
    אופנוע 123/
      ביטוח/
      רישיון/
      תמונות/
      דוחות/
```

הכל יהיה אוטומטי!
