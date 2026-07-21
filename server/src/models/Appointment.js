const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  patient: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  birthDate: Date,
  sex: { type: String, enum: ['Female', 'Male', 'Other'] },
  address: { type: String, trim: true },
  reason: { type: String, required: true, trim: true },
  doctor: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Pending','Confirmed','Completed','Cancelled'], default: 'Pending' },
  diagnosis: { type: String, trim: true },
  treatment: { type: String, trim: true },
  notes: { type: String, trim: true, maxlength: 2000 },
  patientRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  medicalRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
module.exports = mongoose.model('Appointment', schema);
