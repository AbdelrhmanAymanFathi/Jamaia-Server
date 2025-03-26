const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
require('dotenv').config();

// اختبار صلاحية التوكن
router.get('/verify-auth', auth, (req, res) => {
    try {
        // إذا وصلت هنا يعني التوكن صالح
        res.status(200).json({
        success: true,
        user: {
            id: req.user.id,
            role: req.user.role,
            nationalId: req.user.nationalId
        },
        message: 'المصادقة ناجحة ✅',
        timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
        success: false,
        message: 'فشل في التحقق من الصلاحية'
        });
    }
});

// يمكنك إضافة تحقق على الدور
router.get('/admin-check', [auth, admin], (req, res) => {
    res.send('أنت مدير مسموح لك بهذه الصلاحية');
});

module.exports = router;