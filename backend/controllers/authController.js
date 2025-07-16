const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../models/db");
const { generateOTP } = require("../utils/otp");
const { sendOTPEmail } = require("../utils/mailer");

const OTP_EXPIRY_MINUTES = 5;
const MAX_TRUSTED_DEVICES = 3;

exports.register = async (req, res) => {
  console.log("Received req.body ➡️", req.body); 
  const { username, email, password } = req.body;
  try {
    const [existing] = await db.query("SELECT * FROM users WHERE email = ? OR username = ?", [email, username]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", [username, email, hash]);
    res.status(201).json({ message: "User registered successfully" });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  const { email, password, deviceId } = req.body;
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Incorrect password" });

    // Check if device is already trusted
    const [devices] = await db.query("SELECT * FROM trusted_devices WHERE user_id = ? AND device_id = ?", [user.id, deviceId]);

    if (devices.length > 0) {
      // Trusted device, return token
      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
      // Update last_used
      await db.query("UPDATE trusted_devices SET last_used = NOW() WHERE id = ?", [devices[0].id]);
      return res.json({ message: "Login successful", token, trusted: true });
    }

    // Not trusted → Send OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    await db.query("INSERT INTO otps (user_id, code, expires_at) VALUES (?, ?, ?)", [user.id, otpCode, expiresAt]);
    await sendOTPEmail(user.email, otpCode);

    res.status(200).json({ message: "OTP sent to your email", otpRequired: true, userId: user.id });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyOTP = async (req, res) => {
  const { userId, code, deviceId } = req.body;
  try {
    const [otps] = await db.query("SELECT * FROM otps WHERE user_id = ? AND code = ?", [userId, code]);
    if (otps.length === 0) return res.status(400).json({ message: "Invalid OTP" });

    const otp = otps[0];
    if (new Date() > new Date(otp.expires_at)) {
      return res.status(410).json({ message: "OTP expired" });
    }

    // Clean up OTP after verification
    await db.query("DELETE FROM otps WHERE id = ?", [otp.id]);

    // Check if user has < 3 devices
    const [devices] = await db.query("SELECT * FROM trusted_devices WHERE user_id = ?", [userId]);

    if (devices.length >= MAX_TRUSTED_DEVICES) {
      // Remove the oldest one (FIFO strategy)
      const oldest = devices.sort((a, b) => new Date(a.last_used) - new Date(b.last_used))[0];
      await db.query("DELETE FROM trusted_devices WHERE id = ?", [oldest.id]);
    }

    // Save new trusted device
    await db.query("INSERT INTO trusted_devices (user_id, device_id) VALUES (?, ?)", [userId, deviceId]);

    // Generate login token
    const [userRow] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
    const user = userRow[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "OTP verified, login successful", token, trusted: true });

  } catch (err) {
    console.error("OTP verify error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
