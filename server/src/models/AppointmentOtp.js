const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  request: {
    patient: String,
    email: String,
    phone: String,
    reason: String,
    doctor: String,
    date: String,
  },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

module.exports = mongoose.model('AppointmentOtp', schema);
