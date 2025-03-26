const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const multer = require('multer');
require('dotenv').config();

const upload = multer({ dest: 'uploads/' });

router.post('/register', upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'salarySlipImage', maxCount: 1 }
]), async (req, res) => {
  // معالجة بيانات التسجيل
  const userData = {
    ...req.body,
    profileImage: req.files['profileImage'][0].path,
    salarySlipImage: req.files['salarySlipImage'][0].path
  };
  
  const user = await User.create(userData);
  res.send(user);
});

router.post('/login', async (req, res) => {
  try {
    const { nationalId, password } = req.body;
    console.log('Login attempt with:', { nationalId, password }); // إضافة log

    if (!nationalId || !password) {
      return res.status(400).send('يجب إدخال رقم البطاقة وكلمة المرور');
    }

    const user = await User.findOne({ where: { nationalId } });
    console.log('Found user:', user?.nationalId); // إضافة log

    if (!user) {
      return res.status(404).send('رقم البطاقة أو كلمة المرور غير صحيحة');
    }

    console.log('Stored hash:', user.password); // إضافة log
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', validPassword); // إضافة log

    if (!validPassword) {
      return res.status(400).send('رقم البطاقة أو كلمة المرور غير صحيحة');
    }

    // إنشاء التوكن
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.send({ 
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        walletBalance: user.walletBalance
      }
    });

  } catch (error) {
    console.error('Login error:', error); // تحسين رسالة الخطأ
    res.status(500).send('حدث خطأ أثناء تسجيل الدخول');
  }
});

router.post('/register-admin', async (req, res) => {
  try {
    const { secretKey, fullName, nationalId, password, phone } = req.body;
    
    // تحقق من وجود الكود السري
    if (!secretKey) {
      return res.status(400).send('مطلوب كود سري');
    }

    // تحقق من تطابق الكود السري
    if (secretKey !== process.env.ADMIN_SECRET) {
      console.log('الكود المُرسل:', secretKey);
      console.log('الكود الصحيح:', process.env.ADMIN_SECRET);
      return res.status(403).send('غير مصرح به - كود سري خاطئ');
    }

    // تحقق من عدم وجود مستخدم بنفس الرقم القومي
    const existingUser = await User.findOne({ where: { nationalId } });
    if (existingUser) {
      return res.status(400).send('رقم البطاقة مسجل مسبقًا');
    }

    // إنشاء المدير
    // const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = await User.create({
      fullName,
      nationalId,
      password: password,
      phone,
      role: 'admin'
    });

    res.status(201).json({
      message: 'تم إنشاء المدير بنجاح',
      user: {
        id: adminUser.id,
        fullName: adminUser.fullName,
        role: adminUser.role
      }
    });

  } catch (error) {
    console.error('خطأ في إنشاء المدير:', error);
    res.status(500).send('خطأ داخلي في الخادم');
  }
});

module.exports = router;