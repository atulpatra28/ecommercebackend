const express = require('express');
const User = require('../models/user');
const router = express.Router();
const bcrypt = require('bcrypt');
const sendVerificationEmail = async (email, verificationToken) => {
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const Seller = require('../models/seller'); 

await sendVerificationEmail(emailId, verificationToken);

  // Configure the transporter for sending emails
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', //Converting string to boolean
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: 'Mera Bestie <pecommerce8@gmail.com>',
    to: email,
    subject: 'Email Verification',
    text: `Please verify your email by clicking the link: ${verificationUrl}`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully');
  } catch (error) {
    console.error('Error sending verification email:', error);
  }
};

router.post('/signup', async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;
  
      // Check if the user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
  
      // Create a new user
      const userId = require('crypto').randomBytes(8).toString('hex'); // Generate unique user ID
      const user = new User({ name, email, password, userId, phone });
      await user.save();
  
      // Automatically log the user in
      req.session.userId = user.userId;
  
      res.status(201).json({ message: 'User registered successfully', userId });
    } catch (err) {
      res.status(500).json({ error: 'Error registering user' });
    }
  });
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }
  
      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      // Check account status
      if (user.accountStatus === 'suspended') {
        return res.status(403).json({ error: 'Account is suspended' });
      }

      if (user.accountStatus === 'blocked') {
        return res.status(403).json({ error: 'Account is blocked' });
      }

      // If account status is 'open', proceed with login
      if (user.accountStatus === 'open') {
        // Save userId in session
        req.session.userId = user.userId;
    
        // Respond with success
        return res.status(200).json({ message: 'Login successful', userId: user.userId });
      }

      // Handle any other unexpected account status
      return res.status(400).json({ error: 'Invalid account status' });

    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Error logging in' });
    }
  });

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Error logging out' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findOne({ userId }, { name: 1, _id: 0 }); // Fetch only name
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(200).json({ name: user.name });
    } catch (err) {
      res.status(500).json({ error: 'Error fetching user details' });
    }
  });
  

  router.get('/verify-seller', async (req, res) => {
    const { token } = req.query;
  
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }
  
    try {
      // Find the seller by the token
      const seller = await Seller.findOne({ verificationToken: token });
  
      // If no seller is found with this token, return an error
      if (!seller) {
        return res.status(404).json({ success: false, message: 'Invalid verification token' });
      }
  
      // Check if the email is already verified
      if (seller.emailVerified) {
        return res.status(400).json({ success: false, message: 'Email is already verified' });
      }
  
      // Mark the seller's email as verified
      seller.emailVerified = true;
  
      // Clear the verification token (optional, to prevent re-use)
      seller.verificationToken = undefined;
  
      // Save the updated seller record
      await seller.save();
  
      // Send a confirmation email or response (optional)
      // You can send a confirmation email or return a success response here.
      // Example: send a welcome email or success notification
  
      res.status(200).json({ success: true, message: 'Email successfully verified' });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  
  
});

// Seller routes
router.post('/seller/signup', async (req, res) => {
  try {
    const { phoneNumber, emailId, password, name, businessName, businessAddress, businessType } = req.body;

    // Check if seller already exists
    const existingSeller = await Seller.findOne({ email: emailId });
    if (existingSeller) {
      return res.status(400).json({ error: 'Seller already exists' });
    }

    // Generate unique seller ID (MBSLR + 5 digits)
    let sellerId;
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      sellerId = `MBSLR${randomNum}`;
      const existingId = await Seller.findOne({ sellerId });
      if (!existingId) isUnique = true;
    }

    // Create new seller
    const seller = new Seller({
      name,
      phoneNumber,
      email: emailId,
      password,
      sellerId,
      businessName,
      businessAddress, 
      businessType,
      emailVerified: false,
      phoneVerified: false
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    seller.verificationToken = verificationToken; // Add this field to your Seller model

    // Send the verification email
    await sendVerificationEmail(emailId, verificationToken);

    // Save seller to the database
    await seller.save();

    // Store sellerId in session
    req.session.sellerId = sellerId;

    res.status(201).json({ 
      message: 'Seller registered successfully, please verify your email',
      sellerId 
    });

  } catch (err) {
    res.status(500).json({ error: 'Error registering seller' });
  }
});


router.post('/seller/login', async (req, res) => {
  try {
    const { sellerId, emailOrPhone, password } = req.body;

    // Find seller by ID and email/phone
    const seller = await Seller.findOne({
      sellerId,
      $or: [
        { email: emailOrPhone },
        { phoneNumber: emailOrPhone }
      ]
    });

    if (!seller) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Store sellerId in session
    req.session.sellerId = sellerId;

    res.status(200).json({ 
      message: 'Login successful',
      sellerId
    });

  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

router.post('/create-product', async (req, res) => {
  try {
    const { name, price, img, category, description } = req.body; // Include img and description

    if (!name || !price || !img || !category || !description) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    // to ensure price is a valid number
    if (isNaN(price)) {
      return res.status(400).json({ success: false, message: 'Invalid price value' });
    }
    const product = new Product({ name, price, img, category, description });
    const result = await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
});

router.post('/seller/logout', (req, res) => {
  req.session.sellerId = null; // Clear the sellerId explicitly
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Error logging out' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Seller logout successful' });
  });
});

router.delete('/delete-product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const deletedProduct = await Product.findOneAndDelete({ productId });

    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting product', error: error.message });
  }
});

router.get('/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const seller = await Seller.findOne({ sellerId }, { 
      name: 1,
      businessName: 1,
      businessAddress: 1,
      businessType: 1,
      _id: 0 
    });
    
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    
    res.status(200).json(seller);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching seller details' });
  }
});


module.exports = router;
