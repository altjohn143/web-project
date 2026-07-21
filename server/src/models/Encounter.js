const mongoose = require('mongoose');
const vitalSchema = new mongoose.Schema({ temperature: Number, bloodPressure: String, pulse: Number, weight: Number, height: Number, oxygenLevel: Number, allergies: String, initialComplaint: String, recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, recordedAt: Date }, { _id: false });
module.exports = mongoose.model('Encounter', new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  queueNumber: { type: Number, required: true }, queueDate: { type: Date, required: true },
  status: { type: String, enum: ['Waiting', 'In consultation', 'Completed', 'No-show'], default: 'Waiting' },
  vitals: vitalSchema, followUpDate: Date, followUpNotes: String,
  previousEncounter: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter' },
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true }));
