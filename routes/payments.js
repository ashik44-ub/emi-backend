const router = require('express').Router();
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

// Create a new payment
router.post('/create', auth, async (req, res) => {
  try {
    const { amount, month, year, paymentMethod, transactionId } = req.body;
    
    // In this system, any user can make a payment for themselves. 
    // If we wanted Admin to make payments for others, we'd accept userId in the body.
    // For now, we use the logged-in user's ID.
    const userId = req.body.userId && req.role === 'Admin' ? req.body.userId : req.user;

    if (!amount || !month || !year || !paymentMethod || !transactionId) {
      return res.status(400).json({ message: 'All payment fields are required.' });
    }

    const newPayment = new Payment({
      userId,
      amount,
      month,
      year,
      paymentMethod,
      transactionId
    });

    const savedPayment = await newPayment.save();
    res.json(savedPayment);
  } catch (err) {
    console.error('Payment Create Error:', err);
    res.status(500).json({ message: 'Failed to create payment', error: err.message });
  }
});

// Get user's payment history
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user;
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all payments
router.get('/all', auth, async (req, res) => {
  try {
    if (req.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    const payments = await Payment.find().populate('userId', 'fullName memberId mobileNo').sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Admin: Get single payment
router.get('/:id', auth, async (req, res) => {
  try {
    if (req.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    const payment = await Payment.findById(req.params.id).populate('userId', 'fullName memberId mobileNo');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update payment
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    const { amount, month, year, paymentMethod, transactionId } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    payment.amount = amount || payment.amount;
    payment.month = month || payment.month;
    payment.year = year || payment.year;
    payment.paymentMethod = paymentMethod || payment.paymentMethod;
    payment.transactionId = transactionId || payment.transactionId;

    await payment.save();
    res.json({ message: 'Payment updated successfully.', payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete payment
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }
    res.json({ message: 'Payment deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

