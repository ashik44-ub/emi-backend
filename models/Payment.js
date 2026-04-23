const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  month: { type: String, required: true }, // e.g. "January"
  year: { type: Number, required: true },  // e.g. 2026
  paymentMethod: { type: String, enum: ['bKash', 'Nagad', 'Bank', 'Cash'], required: true },
  transactionId: { type: String, required: true },
  paymentDate: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
