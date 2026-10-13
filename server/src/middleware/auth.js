const jwt = require('jsonwebtoken');
const User = require('../models/User');
const activeRoles = ['superadmin', 'receptionist', 'doctor', 'nurse', 'billing'];
module.exports = async (req, res, next) => { const token = req.header('Authorization')?.replace('Bearer ', ''); if (!token) return res.status(401).json({ message: 'Authentication required' }); try { const claims = jwt.verify(token, process.env.JWT_SECRET); const user = await User.findById(claims.id).select('role isActive'); if (!user || user.isActive === false || !activeRoles.includes(user.role)) return res.status(403).json({ message: 'This account is no longer authorized.' }); req.user = { id: user.id, role: user.role }; next(); } catch { res.status(401).json({ message: 'Invalid or expired token' }); } };
