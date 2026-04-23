const router = require('express').Router();
const Payment = require('../models/Payment');
const User = require('../models/User');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Get all deposits grouped by user and month/year
router.get('/all-deposits', auth, async (req, res) => {
  try {
    const { year, month } = req.query;

    let matchStage = {};
    if (year) matchStage.year = parseInt(year);
    if (month) matchStage.month = month;

    const deposits = await Payment.aggregate([
      { $match: matchStage },
      { 
        $group: {
          _id: { userId: '$userId', month: '$month', year: '$year' },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          fullName: '$user.fullName',
          memberId: '$user.memberId',
          month: '$_id.month',
          year: '$_id.year',
          totalAmount: 1
        }
      },
      { $sort: { year: -1, month: -1, fullName: 1 } }
    ]);

    res.json(deposits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get deposits for a specific user (grouped by year/month)
router.get('/my-deposits', auth, async (req, res) => {
  try {
    const deposits = await Payment.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user) } },
      { 
        $group: {
          _id: { month: '$month', year: '$year' },
          totalAmount: { $sum: '$amount' },
          payments: { $push: '$$ROOT' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    res.json(deposits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get yearly summary for all users
router.get('/yearly-summary', auth, async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const summary = await User.aggregate([
      { $match: { role: 'User' } },
      {
        $lookup: {
          from: 'payments',
          let: { userId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$year', targetYear] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: '$month',
                total: { $sum: '$amount' }
              }
            }
          ],
          as: 'yearlyPayments'
        }
      },
      {
        $project: {
          fullName: 1,
          memberId: 1,
          payments: {
            $arrayToObject: {
              $map: {
                input: '$yearlyPayments',
                as: 'p',
                in: { k: '$$p._id', v: '$$p.total' }
              }
            }
          }
        }
      },
      { $sort: { fullName: 1 } }
    ]);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
