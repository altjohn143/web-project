const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.use(auth);
const allowed = ['billing'];
const readAllowed = ['superadmin', 'billing'];
const access = async (req, res, next) => {
  const user = await User.findById(req.user.id).select('role');
  if (!user || !allowed.includes(user.role)) return res.status(403).json({ message: 'Billing access required' });
  req.actor = user;
  next();
};
const readAccess = async (req, res, next) => {
  const user = await User.findById(req.user.id).select('role');
  if (!user || !readAllowed.includes(user.role)) return res.status(403).json({ message: 'Billing access required' });
  req.actor = user;
  next();
};
const rules = [
  body('patient').isMongoId(), body('description').trim().isLength({ min: 2, max: 300 }),
  body('amount').isFloat({ min: 0.01 }).toFloat(), body('amountPaid').optional().isFloat({ min: 0 }).toFloat(),
  body('dueDate').isISO8601().toDate(), body('discountType').optional().isIn(['None', 'Senior Citizen', 'PWD']),
  body('paymentMethod').optional({ checkFalsy: true }).isIn(['Cash', 'Card', 'GCash', 'Bank transfer', 'Other']),
];
const valid = (req, res, next) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? next() : res.status(422).json({ errors: errors.array() });
};
const totals = body => {
  const subtotal = Number(body.amount);
  const discountAmount = body.discountType && body.discountType !== 'None' ? subtotal * 0.2 : 0;
  return { subtotal, discountAmount, amount: subtotal - discountAmount };
};
const publicInvoice = invoice => {
  const item = invoice.toObject ? invoice.toObject() : invoice;
  return { ...item, status: item.status === 'Paid' ? 'Paid' : 'Unpaid' };
};

router.get('/', readAccess, async (req, res, next) => { try {
  const page = Math.max(+req.query.page || 1, 1), limit = Math.min(+req.query.limit || 10, 50), q = req.query.q?.trim();
  let filter = {};
  if (q) { const Patient = require('../models/Patient'); const ids = await Patient.find({ $or: [{ firstName: { $regex: q, $options: 'i' } }, { lastName: { $regex: q, $options: 'i' } }] }).distinct('_id'); filter = { $or: [{ patient: { $in: ids } }, { description: { $regex: q, $options: 'i' } }, { status: { $regex: q, $options: 'i' } }] }; }
  const [data, total] = await Promise.all([Invoice.find(filter).populate('patient', 'firstName lastName email phone').populate('cashier', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Invoice.countDocuments(filter)]);
  res.json({ data: data.map(publicInvoice), total, page, pages: Math.max(Math.ceil(total / limit), 1) });
} catch (error) { next(error); } });

router.post('/', access, rules, valid, async (req, res, next) => { try {
  if (req.actor.role === 'superadmin') return res.status(403).json({ message: 'Superadmin billing access is view-only.' });
  const { subtotal, discountAmount, amount } = totals(req.body);
  const invoice = await Invoice.create({ patient: req.body.patient, description: req.body.description, dueDate: req.body.dueDate, discountType: req.body.discountType || 'None', paymentMethod: req.body.paymentMethod || 'Cash', subtotal, discountAmount, amount, amountPaid: 0, status: 'Unpaid', createdBy: req.user.id });
  res.status(201).json(publicInvoice(invoice));
} catch (error) { next(error); } });

router.put('/:id', access, rules, valid, async (req, res, next) => { try {
  if (req.actor.role === 'superadmin') return res.status(403).json({ message: 'Superadmin billing access is view-only.' });
  const existing = await Invoice.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Invoice not found' });
  if (existing.status === 'Paid') return res.status(422).json({ message: 'Paid billing records are final and cannot be edited.' });
  if (String(existing.patient) !== String(req.body.patient)) return res.status(422).json({ message: 'The patient on an existing billing record cannot be changed.' });
  const { subtotal, discountAmount, amount } = totals(req.body), paid = Number(req.body.amountPaid);
  if (!Number.isFinite(paid) || paid <= 0) return res.status(422).json({ message: 'Amount paid must be greater than 0.' });
  if (paid < amount) return res.status(422).json({ message: 'Only full payments can be registered. Amount paid must cover the discounted total.' });
  const item = await Invoice.findByIdAndUpdate(req.params.id, { description: req.body.description, dueDate: req.body.dueDate, discountType: req.body.discountType || 'None', paymentMethod: req.body.paymentMethod || 'Cash', subtotal, discountAmount, amount, amountPaid: paid, status: 'Paid', paymentDate: new Date(), cashier: req.user.id, receiptNumber: existing.receiptNumber || `CC-${Date.now()}` }, { returnDocument: 'after', runValidators: true });
  res.json(publicInvoice(item));
} catch (error) { next(error); } });

router.delete('/:id', access, async (req, res, next) => { try {
  if (req.actor.role === 'superadmin') return res.status(403).json({ message: 'Superadmin billing access is view-only.' });
  const item = await Invoice.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Invoice not found' });
  if (item.status === 'Paid') return res.status(422).json({ message: 'Paid billing records cannot be deleted.' });
  await item.deleteOne(); res.status(204).end();
} catch (error) { next(error); } });
module.exports = router;
