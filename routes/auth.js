const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const userCount = await User.countDocuments();

    if (userCount > 0) {
      // Must be authenticated and Admin
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ message: 'Access denied. Please login as Admin to add users.' });
      
      try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        if (verified.role !== 'Admin') {
          return res.status(403).json({ message: 'Only Admins can register new users.' });
        }
      } catch (err) {
        return res.status(401).json({ message: 'Invalid token.' });
      }
    } else {
      // Force first user to be Admin
      req.body.role = 'Admin';
    }

    const {
      fullName, memberId, mobileNo, email, fatherName, presentAddress,
      nidNo, nomineeName, nomineeNidNo, relationWithNominee, joiningDate, pinCode, role
    } = req.body;

    // Validation
    if (!fullName || !memberId || !mobileNo || !joiningDate || !pinCode) {
      return res.status(400).json({ message: 'Not all required fields have been entered.' });
    }
    if (pinCode.length !== 4) {
      return res.status(400).json({ message: 'PIN code must be exactly 4 digits.' });
    }

    const existingUser = await User.findOne({ $or: [{ mobileNo }, { memberId }] });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this Mobile No or Member ID already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pinCode, salt);

    const newUser = new User({
      fullName, memberId, mobileNo, email, fatherName, presentAddress,
      nidNo, nomineeName, nomineeNidNo, relationWithNominee, joiningDate, pinCode: hashedPin, role
    });

    const savedUser = await newUser.save();
    
    // Create token
    const token = jwt.sign({ id: savedUser._id, role: savedUser.role }, process.env.JWT_SECRET);
    
    res.json({
      token,
      user: {
        id: savedUser._id,
        fullName: savedUser.fullName,
        memberId: savedUser.memberId,
        mobileNo: savedUser.mobileNo,
        role: savedUser.role
      }
    });

  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { mobileNo, pinCode } = req.body;

    if (!mobileNo || !pinCode) {
      return res.status(400).json({ message: 'Not all fields have been entered.' });
    }

    const user = await User.findOne({ mobileNo });
    if (!user) {
      return res.status(400).json({ message: 'No account with this mobile number has been registered.' });
    }

    const isMatch = await bcrypt.compare(pinCode, user.pinCode);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    
    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        memberId: user.memberId,
        mobileNo: user.mobileNo,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Change PIN
router.post('/change-pin', auth, async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;
    
    if (!oldPin || !newPin) {
      return res.status(400).json({ message: 'Both old and new PINs are required.' });
    }
    if (newPin.length !== 4) {
      return res.status(400).json({ message: 'New PIN must be exactly 4 digits.' });
    }

    const user = await User.findById(req.user);
    const isMatch = await bcrypt.compare(oldPin, user.pinCode);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old PIN.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(newPin, salt);

    user.pinCode = hashedPin;
    await user.save();

    res.json({ message: 'PIN updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Current User Info
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select('-pinCode');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific user by ID (Admin only)
router.get('/user/:id', auth, async (req, res) => {
  try {
    if (req.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    const user = await User.findById(req.params.id).select('-pinCode');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update specific user details (Admin only)
router.put('/user/:id', auth, async (req, res) => {
  try {
    if (req.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    
    const {
      fullName, memberId, mobileNo, email, fatherName, presentAddress,
      nidNo, nomineeName, nomineeNidNo, relationWithNominee, joiningDate, pinCode, role
    } = req.body;

    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if new mobileNo or memberId already exists in another user
    if (mobileNo !== userToUpdate.mobileNo || memberId !== userToUpdate.memberId) {
      const existingUser = await User.findOne({ 
        $or: [{ mobileNo }, { memberId }], 
        _id: { $ne: req.params.id } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Mobile No or Member ID already exists.' });
      }
    }

    userToUpdate.fullName = fullName || userToUpdate.fullName;
    userToUpdate.memberId = memberId || userToUpdate.memberId;
    userToUpdate.mobileNo = mobileNo || userToUpdate.mobileNo;
    userToUpdate.email = email || userToUpdate.email;
    userToUpdate.fatherName = fatherName || userToUpdate.fatherName;
    userToUpdate.presentAddress = presentAddress || userToUpdate.presentAddress;
    userToUpdate.nidNo = nidNo || userToUpdate.nidNo;
    userToUpdate.nomineeName = nomineeName || userToUpdate.nomineeName;
    userToUpdate.nomineeNidNo = nomineeNidNo || userToUpdate.nomineeNidNo;
    userToUpdate.relationWithNominee = relationWithNominee || userToUpdate.relationWithNominee;
    userToUpdate.joiningDate = joiningDate || userToUpdate.joiningDate;
    
    if (role && role !== userToUpdate.role) {
      userToUpdate.role = role;
    }

    if (pinCode && pinCode.length === 4) {
      const salt = await bcrypt.genSalt(10);
      userToUpdate.pinCode = await bcrypt.hash(pinCode, salt);
    }

    await userToUpdate.save();
    res.json({ message: 'User details updated successfully.' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete user
router.delete('/user/:id', auth, async (req, res) => {
  try {
    if (req.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

