// Fix vehicle 405 missing folder IDs
// Run this once: node api/fix-vehicle-405-folders.js

const { initFirebase } = require('./_utils/firebase');

async function fixVehicle405() {
  try {
    const { db } = initFirebase();

    const vehicleId = '405'; // Vehicle document ID
    const vehicleRef = db.collection('vehicles').doc(vehicleId);

    // Check if vehicle exists
    const vehicleDoc = await vehicleRef.get();

    if (!vehicleDoc.exists) {
      console.error('❌ Vehicle 405 not found in Firestore');
      console.log('Checking all vehicles...');

      const allVehicles = await db.collection('vehicles').get();
      console.log('\nAll vehicles:');
      allVehicles.docs.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, License: ${data.licensePlate}, Internal: ${data.internalNumber}`);
      });

      return;
    }

    const currentData = vehicleDoc.data();
    console.log('📋 Current vehicle data:', {
      id: vehicleId,
      licensePlate: currentData.licensePlate,
      internalNumber: currentData.internalNumber,
      insuranceFolderId: currentData.insuranceFolderId || 'MISSING',
      archiveFolderId: currentData.archiveFolderId || 'MISSING',
      photosFolderId: currentData.photosFolderId || 'MISSING'
    });

    // Update with the folder IDs from Vercel logs
    // The insuranceFolderId from the logs is: 1B6matvY_XqOO2xwIpjQXeZDpz6SiSFY

    const updateData = {
      insuranceFolderId: '1B6matvY_XqOO2xwIpjQXeZDpz6SiSFY',
      updatedAt: new Date()
    };

    console.log('\n📝 Updating vehicle with:', updateData);

    await vehicleRef.update(updateData);

    console.log('✅ Vehicle 405 updated successfully!');

    // Verify the update
    const updatedDoc = await vehicleRef.get();
    const updatedData = updatedDoc.data();
    console.log('\n✅ Updated vehicle data:', {
      id: vehicleId,
      licensePlate: updatedData.licensePlate,
      internalNumber: updatedData.internalNumber,
      insuranceFolderId: updatedData.insuranceFolderId,
      archiveFolderId: updatedData.archiveFolderId,
      photosFolderId: updatedData.photosFolderId
    });

    console.log('\n🎉 Fix complete! Riders should now be able to see files.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixVehicle405();
