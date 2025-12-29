require('dotenv').config();
const UserModel = require('./models/firestore/UserModel');

async function createFirstAdmin() {
  try {
    console.log('📝 יוצר משתמש admin ראשון...\n');

    const adminData = {
      username: 'admin',
      email: 'admin@motorcycle-crm.com',
      password: 'Admin123!', // סיסמה ראשונית - יש לשנות אחרי התחברות ראשונה!
      firstName: 'מנהל',
      lastName: 'ראשי',
      role: 'super_admin',
      isActive: true,
      phone: '0501234567'
    };

    const admin = await UserModel.create(adminData);

    console.log('✅ משתמש admin נוצר בהצלחה!\n');
    console.log('📋 פרטי התחברות:');
    console.log('   Username: admin');
    console.log('   Email: admin@motorcycle-crm.com');
    console.log('   Password: Admin123!');
    console.log('\n⚠️  חשוב! שנה את הסיסמה מיד אחרי ההתחברות הראשונה!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה ביצירת משתמש admin:', error.message);
    process.exit(1);
  }
}

// אתחול Firebase קודם
require('./config/firebase');

// המתנה קצרה לאתחול Firebase
setTimeout(() => {
  createFirstAdmin();
}, 1000);
