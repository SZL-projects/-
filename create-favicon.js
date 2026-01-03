const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outputDir = path.join(__dirname, 'frontend', 'public');
const favicon32 = path.join(outputDir, 'favicon-32x32.png');
const faviconOutput = path.join(outputDir, 'favicon.ico');

async function createFavicon() {
  try {
    // sharp לא יכול ליצור .ico ישירות, אבל נשתמש ב-32x32 כ-favicon.png
    // ונשנה את ה-extension ל-.ico (זה יעבוד ברוב הדפדפנים)

    // פשוט נעתיק את ה-32x32 גם כ-favicon.ico
    fs.copyFileSync(favicon32, faviconOutput);
    console.log('✅ נוצר favicon.ico');

  } catch (error) {
    console.error('❌ שגיאה:', error.message);
    process.exit(1);
  }
}

createFavicon();
