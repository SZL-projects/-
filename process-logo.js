const fs = require('fs');
const path = require('path');

// זה סקריפט זמני לעיבוד הלוגו
// אנחנו נשתמש בספריית sharp אם היא מותקנת, אחרת פשוט נעתיק את הקובץ

const inputLogo = path.join(__dirname, 'Gemini_Generated_Image_gkuk1fgkuk1fgkuk.png');
const outputDir = path.join(__dirname, 'frontend', 'public');

async function processLogo() {
  try {
    // ננסה להשתמש ב-sharp
    const sharp = require('sharp');

    console.log('📸 מעבד לוגו עם sharp...');

    // יצירת favicon 32x32
    await sharp(inputLogo)
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(outputDir, 'favicon-32x32.png'));
    console.log('✅ נוצר favicon-32x32.png');

    // יצירת favicon 16x16
    await sharp(inputLogo)
      .resize(16, 16, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(outputDir, 'favicon-16x16.png'));
    console.log('✅ נוצר favicon-16x16.png');

    // יצירת Apple Touch Icon 180x180
    await sharp(inputLogo)
      .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    console.log('✅ נוצר apple-touch-icon.png');

    // יצירת PWA icons
    await sharp(inputLogo)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(outputDir, 'logo192.png'));
    console.log('✅ נוצר logo192.png');

    await sharp(inputLogo)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(outputDir, 'logo512.png'));
    console.log('✅ נוצר logo512.png');

    // העתקה לשימוש כ-Open Graph image
    await sharp(inputLogo)
      .resize(1200, 630, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toFile(path.join(outputDir, 'og-image.png'));
    console.log('✅ נוצר og-image.png');

    console.log('\n🎉 כל הקבצים נוצרו בהצלחה!');

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('⚠️  sharp לא מותקן. מתקין...');
      console.log('הרץ: npm install sharp --save-dev');
      process.exit(1);
    } else {
      console.error('❌ שגיאה:', error.message);
      process.exit(1);
    }
  }
}

processLogo();
