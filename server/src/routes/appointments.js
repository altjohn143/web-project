const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const auth = require('../middleware/auth');

router.use(auth);
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
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  appointment.patientRecord = patient._id;
  appointment.medicalRecord = record._id;
  await appointment.save();
  return appointment;
}

router.get('/', async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ message: 'User not found' });
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
    if (!['admin', 'superadmin'].includes(user.role)) return res.status(403).json({ message: 'Only administrators can create appointments' });
    const appointment = await Appointment.create({ ...req.body, status: 'Pending', createdBy: req.user.id });
    res.status(201).json(appointment);
  } catch (error) { next(error); }
});

router.put('/:id', rules, valid, async (req, res, next) => {
  try {
    const user = await currentUser(req);
    const filter = { _id: req.params.id, ...(user.role === 'doctor' ? { doctor: user.name } : {}) };
    const current = await Appointment.findOne(filter).select('status');
    if (!current) return res.status(404).json({ message: 'Appointment not found or access denied' });
    if (['Completed', 'Cancelled'].includes(current.status)) return res.status(422).json({ message: `${current.status} appointments are final and cannot be edited` });
    const { status: _ignoredStatus, ...editable } = req.body;
    const update = { ...editable, ...(user.role === 'doctor' ? { doctor: user.name } : {}) };
    const item = await Appointment.findOneAndUpdate(filter, update, { new: true, runValidators: true });
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
    res.json(await syncCompletedAppointment(appointment, req.user.id));
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const user = await currentUser(req);
    const filter = { _id: req.params.id, ...(user.role === 'doctor' ? { doctor: user.name } : {}) };
    const current = await Appointment.findOne(filter);
    if (!current) return res.status(404).json({ message: 'Appointment not found or access denied' });
    if (['Completed', 'Cancelled'].includes(current.status)) return res.status(422).json({ message: `${current.status} appointments are final and cannot be deleted` });
    await current.deleteOne();
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
