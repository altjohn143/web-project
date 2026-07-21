const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const staffRoles = ['admin', 'receptionist', 'doctor', 'nurse', 'billing', 'laboratory'];
const specialties = ['Family Physicians', 'General Practitioners (GPs)', 'Internal Medicine Physicians (Internists)', 'Pediatricians', 'Obstetrician/Gynecologists (OB-GYNs)'];
router.use(auth);
const validate = (req, res, next) => { const errors = validationResult(req); return errors.isEmpty() ? next() : res.status(422).json({ errors: errors.array() }); };
const rules = [
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('email').isEmail().normalizeEmail(),
  body('password').matches(strongPassword).withMessage('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.'),
  body('role').isIn(staffRoles),
  body('specialty').if(body('role').equals('doctor')).isIn(specialties).withMessage('Select an approved medical specialty.'),
];
router.get('/', async (req, res, next) => {
  try {
    const actor = await User.findById(req.user.id).select('role');
    if (!actor || !['superadmin', 'admin'].includes(actor.role)) return res.status(403).json({ message: 'Administrative access required' });
    const permitted = actor.role === 'superadmin' ? staffRoles : staffRoles.filter(role => role !== 'admin');
    const requested = req.query.role;
    const role = requested && permitted.includes(requested) ? requested : { $in: permitted };
    res.json(await User.find({ role }).select('name email role specialty createdAt').sort({ role: 1, name: 1 }));
  } catch (error) { next(error); }
});
router.post('/', rules, validate, async (req, res, next) => {
  try {
    const actor = await User.findById(req.user.id).select('role');
    if (!actor || !['superadmin', 'admin'].includes(actor.role)) return res.status(403).json({ message: 'Administrative access required' });
    if (req.body.role === 'admin' && actor.role !== 'superadmin') return res.status(403).json({ message: 'Only a superadmin can create administrator accounts' });
    if (await User.exists({ email: req.body.email })) return res.status(409).json({ message: 'Email already registered' });
    const user = await User.create({ name: req.body.name, email: req.body.email, password: req.body.password, role: req.body.role, specialty: req.body.role === 'doctor' ? req.body.specialty : '' });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, specialty: user.specialty });
  } catch (error) { next(error); }
});
module.exports = router;
