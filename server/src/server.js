require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const User = require('./models/User');
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const configuredClientOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const vercelProjectOrigin = /^https:\/\/web-project(?:-[a-z0-9-]+)?\.vercel\.app$/;
const isAllowedOrigin = origin => !origin || configuredClientOrigins.includes(origin) || vercelProjectOrigin.test(origin);

const superadminAccounts = [
  { name: 'ClaraCare Superadmin One', email: 'superadmin1@claracare.local', passwordEnv: 'SEED_SUPERADMIN1_PASSWORD', role: 'superadmin' },
  { name: 'ClaraCare Superadmin Two', email: 'superadmin2@claracare.local', passwordEnv: 'SEED_SUPERADMIN2_PASSWORD', role: 'superadmin' },
];

async function seedSuperadmins() {
  for (const account of superadminAccounts) {
    const password = process.env[account.passwordEnv];
    if (!password) {
      console.warn(`Skipping ${account.email}: ${account.passwordEnv} is not configured.`);
      continue;
    }
    if (!strongPassword.test(password)) {
      console.warn(`Skipping ${account.email}: ${account.passwordEnv} must be at least 8 characters and include uppercase, lowercase, number, and symbol.`);
      continue;
    }

    const existing = await User.findOne({ email: account.email });
    if (!existing) {
      await User.create({ ...account, password, passwordEnv: undefined });
      console.log(`Created ${account.role}: ${account.email}`);
      continue;
    }

    existing.name = account.name;
    existing.role = account.role;
    existing.specialty = account.specialty || '';
    if (!(await existing.comparePassword(password))) {
      existing.password = password;
      console.log(`Updated password for ${account.role}: ${account.email}`);
    }
    await existing.save();
  }
}

const app = express();
// Render forwards requests through one reverse proxy. Trust it so rate limiting
// can use the original visitor IP from X-Forwarded-For.
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '20kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), authRoutes);
app.use('/api/appointments', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }), appointmentRoutes);
app.use('/api/patients', require('./routes/patients'));
app.use('/api/records', require('./routes/records'));
app.use('/api/users', require('./routes/users'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/workflows', require('./routes/workflows'));
app.use('/api/notifications', require('./routes/notifications'));
app.get('/api/doctors', require('./middleware/auth'), async (_req, res, next) => { try { const User = require('./models/User'); const doctors = await User.find({ role: 'doctor', isActive: { $ne: false } }).select('name email specialty role'); res.json(doctors); } catch (error) { next(error); } });
app.get('/api/dashboard', require('./middleware/auth'), async (req, res, next) => {
  try {
    const Appointment = require('./models/Appointment');
    const Patient = require('./models/Patient');
    const Record = require('./models/MedicalRecord');
    const Invoice = require('./models/Invoice');
    const user = await User.findById(req.user.id).select('name role specialty');
    if (!user) return res.status(401).json({ message: 'User not found' });
    const appointmentFilter = user.role === 'doctor' ? { doctor: user.name } : {};
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const [appointments, patients, records, confirmed, completed, today, invoices] = await Promise.all([
      Appointment.countDocuments(appointmentFilter),
      user.role === 'doctor' ? Patient.countDocuments({ assignedDoctors: user._id }) : Patient.countDocuments(),
      user.role === 'doctor' ? Record.countDocuments({ doctor: user._id }) : Record.countDocuments(),
      Appointment.countDocuments({ ...appointmentFilter, status: 'Confirmed' }),
      Appointment.countDocuments({ ...appointmentFilter, status: 'Completed' }),
      Appointment.countDocuments({ ...appointmentFilter, date: { $gte: start, $lt: end } }),
      Invoice.countDocuments(user.role === 'billing' ? {} : {}),
    ]);
    res.json({ role: user.role, specialty: user.specialty, appointments, patients, records, confirmed, completed, today, invoices });
  } catch (error) { next(error); }
});
app.get('/api/health', (_req, res) => res.json({ status: 'healthy', service: 'ClaraCare API' }));
app.use((err, _req, res, _next) => res.status(err.status || 500).json({ message: err.message || 'Server error' }));

const port = process.env.PORT || 5000;
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/claracare');
    await require('./models/Appointment').updateMany({ status: 'Waiting' }, { $set: { status: 'Confirmed' } });
    await User.deleteMany({ email: { $in: ['admin1@claracare.local', 'admin2@claracare.local', 'doctor1@claracare.local', 'doctor2@claracare.local'] } });
    await seedSuperadmins();
    app.listen(port, () => console.log(`ClaraCare API running on ${port}`));
  } catch (err) {
    console.error('Server startup failed:', err.message);
    process.exit(1);
  }
}
startServer();
