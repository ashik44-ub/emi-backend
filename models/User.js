const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  memberId: { type: String, required: true, unique: true },
  mobileNo: { type: String, required: true, unique: true },
  email: { type: String },
  fatherName: { type: String },
  presentAddress: { type: String },
  nidNo: { type: String },
  nomineeName: { type: String },
  nomineeNidNo: { type: String },
  relationWithNominee: { type: String },
  joiningDate: { type: Date, required: true },
  pinCode: { type: String, required: true }, // Hashed 4 digit pin
  role: { type: String, enum: ['Admin', 'User'], default: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
