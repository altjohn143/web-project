const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const AppointmentOtp = require('../models/AppointmentOtp');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { sendAppointmentOtp, sendAppointmentConfirmation } = require('../services/email');

const careSpecialties = {
  'General medicine': ['Family Physicians', 'General Practitioners (GPs)'],
  'Internal medicine': ['Internal Medicine Physicians (Internists)'],
  Pediatrics: ['Pediatricians'],
  "Women's health": ['Obstetrician/Gynecologists (OB-GYNs)'],
};
const publicCareTypes = Object.keys(careSpecialties);

function isDuringOfficeHours(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return false;
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.slice(0, 5).split(':').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    && date.getUTCDay() >= 1 && date.getUTCDay() <= 5 && hour >= 8 && hour < 17 && minute >= 0 && minute < 60;
}

const patientName = body => [body.firstName, body.middleName, body.lastName]
  .filter(Boolean).map(value => value.trim()).filter(Boolean).join(' ');

const rules = [
  body('patient').trim().isLength({ min: 2, max: 100 }),
  body('reason').trim().isLength({ min: 2, max: 200 }),
  body('doctor').trim().notEmpty(),
  body('date').isISO8601().toDate(),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('birthDate').optional({ checkFalsy: true }).isISO8601().toDate(),
  body('sex').optional({ checkFalsy: true }).isIn(['Female', 'Male', 'Other']),
];
const valid = (req, res, next) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? next() : res.status(422).json({ errors: errors.array() });
};
const currentUser = req => User.findById(req.user.id).select('name role');
const otpRules = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('Enter a first name with at least 2 characters.'),
  body('middleName').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Enter a last name with at least 2 characters.'),
  body('careType').isIn(publicCareTypes).withMessage('Select a type of care.'),
  body('date').custom(isDuringOfficeHours).withMessage('Appointments are available Monday through Friday, from 8:00 AM to 5:00 PM.'),
  body('email').isEmail().withMessage('Enter a valid email address, including @.').normalizeEmail(),
  body('country').matches(/^[A-Z]{2}$/).withMessage('Select a country code.'),
  body('countryCode').matches(/^\+\d{1,4}$/).withMessage('Select a valid country code.'),
  body('phone').custom((phone, { req }) => {
    const validPhone = req.body.country === 'PH' ? /^9\d{9}$/ : /^\d{7,15}$/;
    if (!validPhone.test(phone)) throw new Error(req.body.country === 'PH'
      ? 'Enter a 10-digit Philippine mobile number beginning with 9.'
      : 'Enter a phone number containing 7 to 15 digits.');
    return true;
  }),
];
const otpRequestLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many verification requests. Please try again in 15 minutes.' } });
const otpVerifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many verification attempts. Please try again later.' } });
const hashOtp = code => crypto.createHmac('sha256', process.env.OTP_SECRET || process.env.JWT_SECRET || 'claracare-development-secret').update(code).digest('hex');
const appointmentRequest = (body, doctor) => ({
  patient: patientName(body),
  email: body.email.toLowerCase(),
  phone: `${body.countryCode}${body.phone}`,
  reason: body.careType,
  doctor: doctor.name,
  date: body.date,
});

// Patient-facing endpoints: patients can request an appointment without an account.
router.get('/public/doctors', async (_req, res, next) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('name specialty').sort({ name: 1 });
    res.json(doctors);
  } catch (error) { next(error); }
});

async function assignPractitioner(careType) {
  return User.findOne({ role: 'doctor', specialty: { $in: careSpecialties[careType] } })
    .select('name specialty').sort({ name: 1 });
}

router.post('/public/send-otp', otpRequestLimiter, otpRules, valid, async (req, res, next) => {
  try {
    const doctor = await assignPractitioner(req.body.careType);
    if (!doctor) return res.status(422).json({ message: 'No practitioner is currently available for this type of care. Please contact the clinic.' });
    const request = appointmentRequest(req.body, doctor);
    const existing = await AppointmentOtp.findOne({ email: request.email });
    if (existing && Date.now() - existing.lastSentAt.getTime() < 60 * 1000) return res.status(429).json({ message: 'Please wait one minute before requesting another code.' });
    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const verification = await AppointmentOtp.findOneAndUpdate(
      { email: request.email },
      { request, codeHash: hashOtp(code), attempts: 0, lastSentAt: new Date(), expiresAt },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );
    try { await sendAppointmentOtp(request.email, code); } catch (error) { await verification.deleteOne(); throw error; }
    res.status(201).json({ verificationId: verification._id, message: 'A verification code was sent to your email.' });
  } catch (error) { next(error); }
});

router.post('/public/verify-otp', otpVerifyLimiter, [body('verificationId').isMongoId(), body('code').matches(/^\d{6}$/)], valid, async (req, res, next) => {
  try {
    const verification = await AppointmentOtp.findById(req.body.verificationId);
    if (!verification || verification.expiresAt <= new Date()) {
      if (verification) await verification.deleteOne();
      return res.status(422).json({ message: 'This verification code has expired. Please request a new one.' });
    }
    if (verification.attempts >= 5) { await verification.deleteOne(); return res.status(429).json({ message: 'Too many incorrect codes. Please request a new one.' }); }
    if (verification.codeHash !== hashOtp(req.body.code)) {
      verification.attempts += 1;
      await verification.save();
      return res.status(422).json({ message: 'That verification code is incorrect.' });
    }
    const doctor = await User.findOne({ name: verification.request.doctor, role: 'doctor' }).select('_id');
    if (!doctor) return res.status(422).json({ message: 'The selected doctor is no longer available. Please start again.' });
    const appointment = await Appointment.create({ ...verification.request, status: 'Pending' });
    await verification.deleteOne();
    res.status(201).json({ id: appointment._id, message: 'Your appointment request has been received.' });
  } catch (error) { next(error); }
});

router.use(auth);

async function syncCompletedAppointment(appointment, actorId) {
  if (appointment.status !== 'Completed') return appointment;
  const doctor = await User.findOne({ name: appointment.doctor, role: 'doctor' });
  if (!doctor) throw Object.assign(new Error('Assigned doctor account was not found'), { status: 422 });
  const parts = appointment.patient.trim().split(/\s+/);
  const firstName = parts.shift();
  const lastName = parts.join(' ') || 'Patient';
  const identity = appointment.email
    ? { email: appointment.email.toLowerCase() }
    : { phone: appointment.phone };
  let patient = await Patient.findOne(identity);
  if (!patient) {
    patient = await Patient.create({ firstName, lastName, email: appointment.email, phone: appointment.phone, birthDate: appointment.birthDate, sex: appointment.sex, address: appointment.address, assignedDoctors: [doctor._id], createdBy: actorId });
  } else {
    patient.firstName = firstName; patient.lastName = lastName;
    patient.email = appointment.email || patient.email; patient.phone = appointment.phone;
    patient.birthDate = appointment.birthDate; patient.sex = appointment.sex;
    patient.address = appointment.address || patient.address;
    if (!patient.assignedDoctors) patient.assignedDoctors = [];
    if (!patient.assignedDoctors.some(id => id.equals(doctor._id))) patient.assignedDoctors.push(doctor._id);
    await patient.save();
  }
  const record = await MedicalRecord.findOneAndUpdate(
    { appointment: appointment._id },
    { appointment: appointment._id, patient: patient._id, doctor: doctor._id, visitDate: appointment.date, diagnosis: appointment.diagnosis, treatment: appointment.treatment, notes: appointment.notes, createdBy: actorId },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  appointment.patientRecord = patient._id;
  appointment.medicalRecord = record._id;
  await appointment.save();
  const Invoice = require('../models/Invoice');
  const fee = Number(process.env.CONSULTATION_FEE || 500);
  if (!await Invoice.exists({ sourceType: 'Consultation', source: appointment._id })) {
    await Invoice.create({ patient: patient._id, description: `Consultation with ${doctor.name}`, sourceType: 'Consultation', source: appointment._id, subtotal: fee, amount: fee, dueDate: new Date(), createdBy: actorId });
  }
  return appointment;
}

router.get('/', async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (!['superadmin', 'admin', 'receptionist', 'doctor', 'nurse'].includes(user.role)) return res.status(403).json({ message: 'Appointment access denied' });
    const page = Math.max(+req.query.page || 1, 1);
    const limit = Math.min(+req.query.limit || 10, 50);
    const q = req.query.q?.trim();
    const filters = [];
    if (user.role === 'doctor') filters.push({ doctor: user.name });
    if (q) filters.push({ $or: [{ patient: { $regex: q, $options: 'i' } }, { doctor: { $regex: q, $options: 'i' } }] });
    const filter = filters.length ? { $and: filters } : {};
    const [data, total] = await Promise.all([
      Appointment.find(filter).sort({ date: 1 }).skip((page - 1) * limit).limit(limit),
      Appointment.countDocuments(filter),
    ]);
    res.json({ data, page, pages: Math.max(Math.ceil(total / limit), 1), total });
  } catch (error) { next(error); }
});

router.post('/', rules, valid, async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!['admin', 'superadmin', 'receptionist'].includes(user.role)) return res.status(403).json({ message: 'Appointment scheduling access required' });
    const appointment = await Appointment.create({ ...req.body, status: 'Pending', createdBy: req.user.id });
    res.status(201).json(appointment);
  } catch (error) { next(error); }
});

router.put('/:id', rules, valid, async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!['admin', 'superadmin', 'receptionist', 'doctor'].includes(user.role)) return res.status(403).json({ message: 'Appointment editing access denied' });
    const filter = { _id: req.params.id, ...(user.role === 'doctor' ? { doctor: user.name } : {}) };
    const current = await Appointment.findOne(filter).select('status');
    if (!current) return res.status(404).json({ message: 'Appointment not found or access denied' });
    if (['Completed', 'Cancelled'].includes(current.status)) return res.status(422).json({ message: `${current.status} appointments are final and cannot be edited` });
    const { status: _ignoredStatus, ...editable } = req.body;
    const update = { ...editable, ...(user.role === 'doctor' ? { doctor: user.name } : {}) };
    const item = await Appointment.findOneAndUpdate(filter, update, { returnDocument: 'after', runValidators: true });
    res.json(item);
  } catch (error) { next(error); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (user.role !== 'doctor') return res.status(403).json({ message: 'Only the assigned doctor can update appointment status' });
    const appointment = await Appointment.findOne({ _id: req.params.id, doctor: user.name });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found or access denied' });
    const nextStatus = req.body.status;
    const allowed = appointment.status === 'Pending'
      ? ['Confirmed']
      : appointment.status === 'Confirmed' ? ['Completed', 'Cancelled'] : [];
    if (!allowed.includes(nextStatus)) return res.status(422).json({ message: `A ${appointment.status.toLowerCase()} appointment cannot be changed to ${nextStatus || 'that status'}` });
    if (nextStatus === 'Completed') {
      const required = ['phone', 'birthDate', 'sex', 'diagnosis', 'treatment'];
      const missing = required.filter(field => !appointment[field]);
      if (missing.length) return res.status(422).json({ message: `Complete the appointment details first: ${missing.join(', ')}` });
    }
    appointment.status = nextStatus;
    await appointment.save();
    let emailWarning;
    if (nextStatus === 'Confirmed' && appointment.email) {
      try { await sendAppointmentConfirmation(appointment); }
      catch (error) { console.error('Appointment confirmation email failed:', error.message); emailWarning = 'The appointment was confirmed, but the confirmation email could not be sent.'; }
    }
    const result = await syncCompletedAppointment(appointment, req.user.id);
    res.json({ ...result.toObject(), ...(emailWarning ? { emailWarning } : {}) });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!['admin', 'superadmin', 'receptionist'].includes(user.role)) return res.status(403).json({ message: 'Appointment deletion access denied' });
    const filter = { _id: req.params.id, ...(user.role === 'doctor' ? { doctor: user.name } : {}) };
    const current = await Appointment.findOne(filter);
    if (!current) return res.status(404).json({ message: 'Appointment not found or access denied' });
    if (['Completed', 'Cancelled'].includes(current.status)) return res.status(422).json({ message: `${current.status} appointments are final and cannot be deleted` });
    await current.deleteOne();
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
