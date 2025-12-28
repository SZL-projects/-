// Script to update user password in Firebase
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('./config/firebase');

async function updatePassword() {
  try {
    console.log('Searching for user...');

    // מציאת המשתמש לפי אימייל
    const usersSnapshot = await db.collection('users')
      .where('email', '==', 'b0583639333@gmail.com')
      .get();

    if (usersSnapshot.empty) {
      console.log('❌ User not found');
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    console.log('✅ User found:', userDoc.id);

    // יצירת סיסמה מוצפנת חדשה
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('21232998110', salt);

    // עדכון הסיסמה
    await userDoc.ref.update({
      password: hashedPassword,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Password updated successfully!');
    console.log('=====================================');
    console.log('You can now login with:');
    console.log('Username: b0583639333@gmail.com');
    console.log('Password: 21232998110');
    console.log('=====================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating password:', error);
    process.exit(1);
  }
}

updatePassword();
