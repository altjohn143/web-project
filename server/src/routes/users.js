const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const staffRoles = ['receptionist', 'doctor', 'nurse', 'billing'];
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
    if (!actor || actor.role !== 'superadmin') return res.status(403).json({ message: 'Superadmin access required' });
    const permitted = staffRoles;
    const requested = req.query.role;
    const role = requested && permitted.includes(requested) ? requested : { $in: permitted };
    const filters = [{ role }];
    if (req.query.status === 'active') filters.push({ isActive: { $ne: false } });
    if (req.query.status === 'archived') filters.push({ isActive: false });
    if (req.query.q?.trim()) {
      const query = { $regex: req.query.q.trim(), $options: 'i' };
      filters.push({ $or: [{ name: query }, { email: query }] });
    }
    const sortKey = ['name', 'role', 'createdAt'].includes(req.query.sort) ? req.query.sort : 'createdAt';
    const direction = req.query.order === 'asc' ? 1 : -1;
    const filter = filters.length === 1 ? filters[0] : { $and: filters };
    const select = 'name email role specialty isActive createdAt';
    if (req.query.paged === '1') {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 50);
      const [data, total] = await Promise.all([User.find(filter).select(select).sort({ [sortKey]: direction, _id: direction }).skip((page - 1) * limit).limit(limit), User.countDocuments(filter)]);
      return res.json({ data, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
    }
    res.json(await User.find(filter).select(select).sort({ [sortKey]: direction, _id: direction }));
  } catch (error) { next(error); }
});
router.post('/', rules, validate, async (req, res, next) => {
  try {
    const actor = await User.findById(req.user.id).select('role');
    if (!actor || actor.role !== 'superadmin') return res.status(403).json({ message: 'Superadmin access required' });
    if (await User.exists({ email: req.body.email })) return res.status(409).json({ message: 'Email already registered' });
    const user = await User.create({ name: req.body.name, email: req.body.email, password: req.body.password, role: req.body.role, specialty: req.body.role === 'doctor' ? req.body.specialty : '' });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, specialty: user.specialty });
  } catch (error) { next(error); }
});
const updateRules = [
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('email').isEmail().normalizeEmail(),
  body('specialty').optional().trim(),
  body('password').optional({ checkFalsy: true }).matches(strongPassword).withMessage('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.'),
];
const canManage = (actor, target) => actor.role === 'superadmin' && target.role !== 'superadmin';
router.put('/:id', updateRules, validate, async (req, res, next) => {
  try {
    const actor = await User.findById(req.user.id).select('role');
    const target = await User.findById(req.params.id);
    if (!actor || actor.role !== 'superadmin' || !target || !canManage(actor, target)) return res.status(403).json({ message: 'You cannot edit this account' });
    if (await User.exists({ email: req.body.email, _id: { $ne: target._id } })) return res.status(409).json({ message: 'Email already registered' });
    target.name = req.body.name;
    target.email = req.body.email;
    target.specialty = target.role === 'doctor' ? req.body.specialty || '' : '';
    if (req.body.password) target.password = req.body.password;
    await target.save();
    res.json({ id: target.id, name: target.name, email: target.email, role: target.role, specialty: target.specialty, isActive: target.isActive });
  } catch (error) { next(error); }
});
router.patch('/:id/archive', async (req, res, next) => {
  try {
    const actor = await User.findById(req.user.id).select('role');
    const target = await User.findById(req.params.id);
    if (!actor || actor.role !== 'superadmin' || !target || !canManage(actor, target)) return res.status(403).json({ message: 'You cannot archive this account' });
    if (String(target._id) === String(req.user.id)) return res.status(422).json({ message: 'You cannot archive your own account' });
    target.isActive = false;
    await target.save();
    res.json({ message: 'Account archived' });
  } catch (error) { next(error); }
});
router.patch('/:id/restore', async (req, res, next) => {
  try {
    const actor = await User.findById(req.user.id).select('role');
    const target = await User.findById(req.params.id);
    if (!actor || actor.role !== 'superadmin' || !target || !canManage(actor, target)) return res.status(403).json({ message: 'You cannot restore this account' });
    target.isActive = true;
    await target.save();
    res.json({ message: 'Account restored' });
  } catch (error) { next(error); }
});
module.exports = router;
