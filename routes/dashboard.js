const router = require('express').Router();
const Payment = require('../models/Payment');
const User = require('../models/User');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user;
    
    // Total Members (For everyone)
    const totalMembers = await User.countDocuments({ role: 'User' });

    // Total Collection (Overall - For Admin)
    let totalCollection = 0;
    if (req.role === 'Admin') {
      const allPayments = await Payment.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalCollection = allPayments.length > 0 ? allPayments[0].total : 0;
    }

    // User's own balance / total paid
    const userPayments = await Payment.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const userTotalPaid = userPayments.length > 0 ? userPayments[0].total : 0;

    // Monthly due calculation: Assume monthly due is a fixed amount, e.g., 500
    // In a real app, this might be dynamic based on user profile. 
    // Here we'll just return what they paid this month and this year to infer due on frontend.
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    const userThisMonth = await Payment.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), month: currentMonth, year: currentYear } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const paidThisMonth = userThisMonth.length > 0 ? userThisMonth[0].total : 0;

    const userThisYear = await Payment.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), year: currentYear } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const paidThisYear = userThisYear.length > 0 ? userThisYear[0].total : 0;

    res.json({
      totalMembers,
      totalCollection,
      userTotalPaid,
      paidThisMonth,
      paidThisYear,
      currentMonth,
      currentYear
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all members (users) list
router.get('/members', auth, async (req, res) => {
  try {
    const members = await User.find({ role: 'User' }).select('-pinCode -__v').sort({ createdAt: -1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
