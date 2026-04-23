const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    await mongoose.connect('mongodb+srv://shopnilashik4_db_user:admin@monthlydps.yo2fb8j.mongodb.net/emi_system?appName=monthlydps');
    const User = require('./models/User');

    const adminExists = await User.findOne({ role: 'Admin' });
    if (adminExists) {
      console.log('Admin already exists.');
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash('1234', salt);

    const newAdmin = new User({
      fullName: 'System Admin',
      memberId: 'ADMIN001',
      mobileNo: '01700000000',
      joiningDate: new Date(),
      pinCode: hashedPin,
      role: 'Admin'
    });

    await newAdmin.save();
    console.log('Admin created successfully! Mobile: 01700000000, PIN: 1234');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

createAdmin();
