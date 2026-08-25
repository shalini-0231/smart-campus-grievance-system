const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET || 'scgrs_super_secret_jwt_key_2026',
    { expiresIn: '30d' }
  );
};

// Register User
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already registered with this email.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
      department: role === 'admin' ? (department || 'General Administration') : null
    });

    await newUser.save();

    // Create token
    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error in user registration.', error: error.message });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Create token
    const token = generateToken(user);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error in user login.', error: error.message });
  }
};

// Get current user info
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile.', error: error.message });
  }
};

// Seed demo users (run on startup)
exports.seedDemoUsers = async () => {
  try {
    const studentEmail = 'student@scgrs.com';
    const adminEmail = 'admin@scgrs.com';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Seed student
    const hasStudent = await User.findOne({ email: studentEmail });
    if (!hasStudent) {
      const student = new User({
        name: 'Demo Student',
        email: studentEmail,
        password: hashedPassword,
        role: 'student'
      });
      await student.save();
      console.log('Demo Student account seeded successfully.');
    }

    // Seed admin
    const hasAdmin = await User.findOne({ email: adminEmail });
    if (!hasAdmin) {
      const admin = new User({
        name: 'Demo Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        department: 'General Administration'
      });
      await admin.save();
      console.log('Demo Admin account seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding demo accounts:', error.message);
  }
};
