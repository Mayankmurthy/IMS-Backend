 
const express = require('express');
const User = require('../models/User'); 
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
 
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    console.error("JWT_SECRET environment variable is not set!");
    process.exit(1);
}
 
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
if (!EMAIL_USER || !EMAIL_PASS) {
    console.error("EMAIL_USER or EMAIL_PASS environment variables are not set for Nodemailer!");
}
 
const uploadPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}
const storage = multer.diskStorage({
    destination: uploadPath,
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });
 
const otpStore = {};
const verifiedEmails = {};
 

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});
 
router.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
 
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = { value: String(otp), expiresAt: Date.now() + 600000 };
 
    const mailOptions = {
        from: `"GrowLife Insurance" <${EMAIL_USER}>`,
        to: email,
        subject: "🔐 Secure Login OTP - GrowLife",
        html: `<div>
                 <h2>GrowLife Login Verification</h2>
                 <p>Use the OTP below to complete your login:</p>
                 <h3>${otp}</h3>
                 <p>This code is valid for <strong>10 minutes</strong>.</p>
                </div>`,
    };
 
    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'OTP sent successfully' });
        setTimeout(() => {
            if (otpStore[email] && Date.now() > otpStore[email].expiresAt) {
                delete otpStore[email];
            }
        }, 600000);
    } catch (error) {
        console.error("Error sending OTP email:", error);
        res.status(500).json({ message: 'Failed to send OTP', error: error.message });
    }
});
 
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!otpStore[email]) return res.status(400).json({ message: 'No OTP found. Request a new OTP.' });
    if (Date.now() > otpStore[email].expiresAt) {
        delete otpStore[email];
        return res.status(400).json({ message: 'OTP expired, request a new one.' });
    }
    if (String(otpStore[email].value) !== String(otp)) {
        return res.status(400).json({ message: 'Invalid OTP. Try again.' });
    }
 
    verifiedEmails[email] = true;
    delete otpStore[email];
    res.status(200).json({ message: 'Email verified successfully' });
});
 
router.post('/signup', upload.single('file'), async (req, res) => {
    try {
        const { username, dateofbirth, mobile, email, password } = req.body;
        const filePath = req.file ? req.file.filename : null;
        const role = username.includes("@agent") ? "agent" : username === "admin" ? "admin" : "user";
 
        if (!verifiedEmails[email]) {
            return res.status(400).json({ error: "Email not verified. Please verify your email using OTP." });
        }
 
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ error: "Username already exists. Please choose another." });
        }
 
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({ error: "Email already registered. Try logging in." });
        }
 
        const newUser = new User({
            username,
            dateofbirth,
            mobile,
            email,
            password: password, 
            file: filePath,
            role: role
        });
 
        console.log("Saving user to DB:", newUser);
        await newUser.save();
        delete verifiedEmails[email]; 
 
        res.status(201).json({
            message: "User registered successfully!",
            user: { username: newUser.username, email: newUser.email, mobile: newUser.mobile }
        });
 
        setTimeout(async () => {
            const welcomeMailOptions = {
                from: `"GrowLife Insurance" <${EMAIL_USER}>`,
                to: email,
                subject: "Welcome to GrowLife Insurance 🎉",
                html: `<h2>Dear ${username},</h2>
                      <p>Congratulations! Your signup was successful.</p>
                      <p>We're thrilled to have you onboard.</p>
                      <p><strong>Stay insured, stay secure!</strong></p>`
            };
            try {
                await transporter.sendMail(welcomeMailOptions);
            } catch (error) {
                console.error("Error sending welcome email:", error);
            }
        }, 1000);
 
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Failed to register user", details: error.message });
    }
});
 
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
 
        if (!user) {
            return res.status(401).json({ error: "Invalid username or password" });
        }
 
        
        if (user.password !== password) {
            return res.status(401).json({ error: "Invalid username or password" });
        }
        console.log("User found:", user);
        const role = user.role || (user.username === "admin" ? "admin" : user.username.includes("@agent") ? "agent" : "user");
        console.log("User role determined:", role);
        const token = jwt.sign({ id: user._id, username: user.username, role }, SECRET_KEY, { expiresIn: "7d" });
 
        res.status(200).json({
            message: "Login successful!",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                mobile: user.mobile,
                role: role
            },
            token
        });
 
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Server error during login", details: error.message });
    }
});
 
 
module.exports = router;
  