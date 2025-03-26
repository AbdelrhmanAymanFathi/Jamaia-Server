const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // استخراج التوكن من الهيدر
  const authHeader = req.header('Authorization');
  
  // التحقق من وجود الهيدر
  if (!authHeader) {
    return res.status(401).json({error:'Access denied. No token provided.'});
  }

  // فصل الجزء "Bearer" من التوكن
  const parts = authHeader.split(' ');
  
  // التحقق من التنسيق الصحيح
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({error:'Invalid token format. Use: Bearer <token>'});
  }

  const token = parts[1];

  try {
    // التحقق من التوكن باستخدام السكرت
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    res.status(401).json({error:'Invalid or expired token'});
  }
};