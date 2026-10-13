const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Encounter = require('../models/Encounter');
const Prescription = require('../models/Prescription');
const Notification = require('../models/Notification');
router.use(auth);
const actor = req => User.findById(req.user.id).select('name role');
const dayRange = value => { const start = value ? new Date(value) : new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1); return { start, end }; };
const populateEncounter = query => query.populate('patient', 'firstName lastName email phone birthDate sex address').populate('doctor', 'name specialty').populate('appointment');
const valid = (req, res, next) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? next() : res.status(422).json({ errors: errors.array() });
};
const vitalsRules = [
  body('temperature').isFloat({ min: 30, max: 45 }).toFloat().withMessage('Temperature must be between 30 and 45 °C.'),
  body('bloodPressure').trim().matches(/^\d{2,3}\/\d{2,3}$/).withMessage('Enter blood pressure as systolic/diastolic, for example 120/80.'),
  body('pulse').isInt({ min: 30, max: 250 }).toInt().withMessage('Pulse must be between 30 and 250 bpm.'),
  body('oxygenLevel').isInt({ min: 50, max: 100 }).toInt().withMessage('Oxygen level must be between 50 and 100%.'),
  body('weight').optional({ checkFalsy: true }).isFloat({ min: 1, max: 500 }).toFloat(),
  body('height').optional({ checkFalsy: true }).isFloat({ min: 30, max: 300 }).toFloat(),
  body('allergies').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
  body('initialComplaint').trim().isLength({ min: 2, max: 1000 }).withMessage('Enter the patient’s concern or initial complaint.'),
];

router.get('/queue', async (req, res, next) => { try {
  const user = await actor(req);
  if (!['superadmin','admin','receptionist','doctor','nurse'].includes(user.role)) return res.status(403).json({ message: 'Queue access denied' });
  const { start, end } = dayRange(req.query.date);
  const filter = req.query.completed === 'all' ? {} : { queueDate: { $gte: start, $lt: end } };
  if (user.role === 'nurse') filter.status = 'Awaiting vitals';
  if (user.role === 'doctor') Object.assign(filter, { doctor: user._id, status: { $in: ['Waiting', 'In consultation', 'Completed'] } });
  res.json(await populateEncounter(Encounter.find(filter).sort({ queueNumber: 1 })));
} catch (e) { next(e); } });

router.get('/patients/:patientId/encounters', async (req, res, next) => { try {
  const user = await actor(req);
  if (!['superadmin','admin','receptionist','doctor','nurse'].includes(user.role)) return res.status(403).json({ message: 'Clinical history access denied' });
  const filter = { patient: req.params.patientId, ...(user.role === 'doctor' ? { doctor: user._id } : {}) };
  res.json(await populateEncounter(Encounter.find(filter).sort({ queueDate: -1 }).limit(10)));
} catch (e) { next(e); } });

router.post('/check-in/:appointmentId', async (req, res, next) => { try {
  const user = await actor(req); if (!['superadmin','admin','receptionist'].includes(user.role)) return res.status(403).json({ message: 'Reception access required' });
  const appointment = await Appointment.findById(req.params.appointmentId); if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (!['Pending', 'Confirmed'].includes(appointment.status)) return res.status(422).json({ message: 'Only active appointment requests can be checked in.' });
  if (await Encounter.exists({ appointment: appointment._id })) return res.status(409).json({ message: 'Patient is already checked in' });
  const names = appointment.patient.trim().split(/\s+/), firstName = names.shift(), lastName = names.join(' ') || 'Patient', identity = { firstName, lastName, phone: appointment.phone };
  let patient = await Patient.findOne(identity);
  if (!patient) patient = await Patient.create({ firstName, lastName, email: appointment.email, phone: appointment.phone || 'Not provided', birthDate: appointment.birthDate || new Date('1900-01-01'), sex: appointment.sex || 'Other', address: appointment.address, createdBy: req.user.id });
  const { start, end } = dayRange(), queueNumber = await Encounter.countDocuments({ queueDate: { $gte: start, $lt: end } }) + 1;
  const encounter = await Encounter.create({ appointment: appointment._id, patient: patient._id, queueNumber, queueDate: new Date(), status: 'Awaiting vitals', checkedInBy: req.user.id });
  appointment.status = 'Checked in'; await appointment.save();
  await Notification.create({ roles: ['superadmin','admin','nurse'], type: 'Appointment', title: `Vitals needed for patient #${queueNumber}`, message: `${appointment.patient} has been checked in and is ready for nursing assessment.`, link: '/queue' });
  res.status(201).json(await populateEncounter(Encounter.findById(encounter._id)));
} catch (e) { next(e); } });

router.patch('/queue/:id/status', async (req, res, next) => { try { const user = await actor(req); const item = await Encounter.findById(req.params.id); if (!item) return res.status(404).json({ message: 'Queue entry not found' }); const transitions = { Waiting: ['In consultation','No-show'], 'In consultation': ['Completed'], Completed: [], 'No-show': [] }; if (!transitions[item.status].includes(req.body.status)) return res.status(422).json({ message: 'Invalid queue status transition' }); if (req.body.status === 'No-show' && !['superadmin','admin','receptionist','doctor'].includes(user.role)) return res.status(403).json({ message: 'Access denied' }); if (req.body.status !== 'No-show' && user.role !== 'doctor') return res.status(403).json({ message: 'Only the assigned doctor can progress consultation' }); if (user.role === 'doctor' && !item.doctor.equals(user._id)) return res.status(403).json({ message: 'This patient is assigned to another doctor' }); item.status = req.body.status; await item.save(); await Notification.create({ roles: ['superadmin','admin','receptionist','nurse'], type: 'Appointment', title: `Queue #${item.queueNumber} updated`, message: `The patient status is now ${item.status}.`, link: '/queue' }); res.json(item); } catch (e) { next(e); } });

router.put('/queue/:id/vitals', vitalsRules, valid, async (req, res, next) => { try {
  const user = await actor(req); if (!['superadmin','admin','nurse'].includes(user.role)) return res.status(403).json({ message: 'Nursing access required' });
  const item = await Encounter.findOneAndUpdate({ _id: req.params.id, status: 'Awaiting vitals' }, { vitals: { ...req.body, recordedBy: req.user.id, recordedAt: new Date() } }, { returnDocument: 'after', runValidators: true });
  if (!item) return res.status(422).json({ message: 'This patient is not awaiting nursing vitals.' });
  res.json(await populateEncounter(Encounter.findById(item._id)));
} catch (e) { next(e); } });

router.post('/queue/:id/confirm-doctor', async (req, res, next) => { try {
  const user = await actor(req); if (!['superadmin','admin','nurse'].includes(user.role)) return res.status(403).json({ message: 'Nursing access required' });
  const item = await Encounter.findById(req.params.id).populate('appointment');
  if (!item) return res.status(404).json({ message: 'Encounter not found' });
  if (!item.vitals?.recordedAt) return res.status(422).json({ message: 'Record the patient’s vitals before assigning a doctor.' });
  if (item.doctor) return res.status(422).json({ message: 'A doctor has already been confirmed for this patient.' });
  const doctor = await User.findOne({ name: item.appointment.doctor, role: 'doctor', isActive: { $ne: false } });
  if (!doctor) return res.status(422).json({ message: `No available doctor is assigned for ${item.appointment.reason}. Keep this patient in nursing care and notify reception.` });
  item.doctor = doctor._id; item.status = 'Waiting'; await item.save();
  const patient = await Patient.findById(item.patient); if (patient) { patient.assignedDoctors = [doctor._id]; await patient.save(); }
  await Notification.create({ user: doctor._id, type: 'Appointment', title: `Patient ready for consultation`, message: `${item.appointment.patient} has completed nursing assessment and is assigned to you.`, link: '/queue' });
  res.json(await populateEncounter(Encounter.findById(item._id)));
} catch (e) { next(e); } });

router.put('/queue/:id/follow-up', async (req, res, next) => { try { const user = await actor(req); if (user.role !== 'doctor') return res.status(403).json({ message: 'Doctor access required' }); const item = await Encounter.findOneAndUpdate({ _id: req.params.id, doctor: user._id }, { followUpDate: req.body.followUpDate, followUpNotes: req.body.followUpNotes }, { returnDocument: 'after' }); if (!item) return res.status(404).json({ message: 'Encounter not found' }); await Notification.create({ roles: ['receptionist','admin','superadmin'], type: 'Follow-up', title: 'Follow-up scheduling requested', message: `A follow-up was recommended for ${new Date(req.body.followUpDate).toLocaleDateString()}.`, link: '/queue' }); res.json(item); } catch (e) { next(e); } });
router.post('/follow-ups/:id/schedule', async(req,res,next)=>{try{const user=await actor(req);if(!['superadmin','admin','receptionist'].includes(user.role))return res.status(403).json({message:'Reception access required'});const encounter=await Encounter.findById(req.params.id).populate('patient').populate('doctor');if(!encounter?.followUpDate)return res.status(422).json({message:'No follow-up recommendation found'});if(await Appointment.exists({followUpOf:encounter._id}))return res.status(409).json({message:'Follow-up already scheduled'});const p=encounter.patient;const appointment=await Appointment.create({patient:`${p.firstName} ${p.lastName}`,email:p.email,phone:p.phone,birthDate:p.birthDate,sex:p.sex,address:p.address,reason:encounter.followUpNotes||'Follow-up consultation',doctor:encounter.doctor.name,date:req.body.date||encounter.followUpDate,status:'Pending',followUpOf:encounter._id,createdBy:req.user.id});res.status(201).json(appointment)}catch(e){next(e)}});

router.get('/prescriptions', async (req, res, next) => { try { const user = await actor(req); if (!['superadmin','admin','doctor','nurse'].includes(user.role)) return res.status(403).json({ message: 'Clinical access required' }); const filter = user.role === 'doctor' ? { doctor: user._id } : {}; res.json(await Prescription.find(filter).populate('patient', 'firstName lastName birthDate sex address').populate('doctor', 'name specialty').populate('encounter').sort({ issuedAt: -1 })); } catch (e) { next(e); } });
router.post('/prescriptions', async (req, res, next) => { try { const user = await actor(req); if (user.role !== 'doctor') return res.status(403).json({ message: 'Doctor access required' }); const encounter = await Encounter.findOne({ _id: req.body.encounter, doctor: user._id, status: 'Completed' }); if (!encounter) return res.status(422).json({ message: 'Prescriptions require your completed consultation' }); res.status(201).json(await Prescription.create({ encounter: encounter._id, patient: encounter.patient, doctor: user._id, medicines: req.body.medicines })); } catch (e) { next(e); } });


module.exports = router;
