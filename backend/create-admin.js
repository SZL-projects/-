// Script to create admin user in Firebase
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('./config/firebase');

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('21232998110', salt);

    // Create user document
    const userDoc = {
      username: 'b0583639333@gmail.com',
      email: 'b0583639333@gmail.com',
      password: hashedPassword,
      firstName: 'שלמה זלמן',
      lastName: 'לרנר',
      phone: '0583639333',
      role: 'super_admin',
      isActive: true,
      isLocked: false,
      loginAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to Firestore
    const docRef = await db.collection('users').add(userDoc);

    console.log('\n✅ Admin user created successfully!');
    console.log('=====================================');
    console.log('User ID:', docRef.id);
    console.log('Username:', userDoc.username);
    console.log('Email:', userDoc.email);
    console.log('\n🔐 Login credentials:');
    console.log('Username: b0583639333@gmail.com');
    console.log('Password: 21232998110');
    console.log('=====================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
