const express = require('express');
const router = express.Router();
const { User, Association, UserAssociation } = require('../models');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { Op } = require('sequelize');

router.post('/', [auth, admin], async (req, res) => {
  try {
    const { name, monthlyAmount, duration, startDate } = req.body;

    // ================ التحقق من البيانات المدخلة ================
    const errors = [];
    
    if (!name || name.trim().length < 3) {
      errors.push('الاسم مطلوب ويجب أن يكون على الأقل 3 أحرف');
    }

    if (!monthlyAmount || isNaN(monthlyAmount)) {
      errors.push('المبلغ الشهري مطلوب ويجب أن يكون رقمًا');
    }

    if (!duration || !Number.isInteger(Number(duration))) {
      errors.push('المدة مطلوبة ويجب أن تكون عددًا صحيحًا');
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // ================ معالجة البيانات ================
    const processedData = {
      name: name.trim(),
      monthlyAmount: parseFloat(monthlyAmount),
      duration: parseInt(duration),
      startDate: startDate ? new Date(startDate) : new Date(),
      status: 'pending'
    };

    // ================ التحقق من التواريخ ================
    if (isNaN(processedData.startDate.getTime())) {
      return res.status(400).json({ error: 'تاريخ بداية غير صحيح' });
    }

    // ================ التحقق من التكرار ================
    const existingAssociation = await Association.findOne({
      where: {
        name: processedData.name
      }
    });

    if (existingAssociation) {
      return res.status(409).json({
        error: 'اسم الجمعية موجود مسبقًا',
        existingId: existingAssociation.id
      });
    }

    // ================ إنشاء الجمعية ================
    const association = await Association.create(processedData);

    // ================ الرد الناجح ================
    res.status(201).json({
      message: 'تم إنشاء الجمعية بنجاح',
      association: {
        id: association.id,
        name: association.name,
        monthlyAmount: association.monthlyAmount,
        status: association.status || 'active',
        duration: association.duration,
        startDate: association.startDate.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('تفاصيل الخطأ:', error);
    
    // معالجة أخطاء Sequelize
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({ errors });
    }

    res.status(500).json({
      error: 'فشل في إنشاء الجمعية',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    
    // معالجة القيم الرقمية بشكل آمن
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedPageSize = Math.min(Math.max(1, parseInt(pageSize) || 10), 100);

    // بناء شرط البحث
    const whereClause = {};
    if (status) {
      whereClause.status = {
        [Op.eq]: status || "pending" // استخدام عامل المقارنة Op.eq للتطابق التام
      };
    }

    // استرجاع البيانات
    const { count, rows } = await Association.findAndCountAll({
      where: whereClause,
      limit: parsedPageSize,
      offset: (parsedPage - 1) * parsedPageSize,
      order: [['createdAt', 'DESC']]
    });

    // حساب عدد الصفحات
    const totalPages = Math.ceil(count / parsedPageSize);

    // إرسال النتيجة
    res.json({
      success: true,
      total: count,
      currentPage: parsedPage,
      totalPages: totalPages,
      data: rows
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في الاسترجاع',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// تحديث الجمعية (للمدير فقط)
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const association = await Association.findByPk(req.params.id);
    if (!association) return res.status(404).send('الجمعية غير موجودة');

    // منع تحديث الجمعيات المكتملة
    if (association.status === 'completed') {
      return res.status(400).json({error: 'لا يمكن تعديل جمعية مكتملة'});
    }

    await association.update(req.body);
    res.json(association);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في التحديث'});
  }
});

// حذف الجمعية (للمدير فقط)
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const association = await Association.findByPk(req.params.id);
    if (!association) return res.status(404).json({error:'الجمعية غير موجودة'});

    await association.destroy();
    res.json({ message: 'تم حذف الجمعية بنجاح' });
  } catch (error) {
    res.status(500).json({error:'خطأ في الحذف'});
  }
});

// التسجيل في جمعية (للمستخدمين العاديين)
router.post('/:id/join', auth, async (req, res) => {
  try {
    const association = await Association.findByPk(req.params.id);
    const user = req.user;

    // التحقق من وجود الجمعية
    if (!association) {
      return res.status(404).json({ 
        success: false,
        error: 'الجمعية غير موجودة' 
      });
    }

    // التحقق من حالة الجمعية
    if (association.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن الانضمام لجمعية غير نشطة'
      });
    }

    // التحقق من العضوية المسبقة
    const existingMembership = await UserAssociation.findOne({
      where: { 
        userId: user.id,
        associationId: association.id 
      }
    });

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        error: 'أنت مسجل بالفعل في هذه الجمعية'
      });
    }

    // التسجيل في الجمعية مع التحقق من البيانات
    const newMembership = await UserAssociation.create({
      UserId: user.id,
      AssociationId: association.id,
      remainingAmount: association.monthlyAmount * association.duration,
      joinDate: new Date(),
      status: 'active'
    });

    // الرد الناجح مع بيانات العضوية
    res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح',
      membership: {
        id: newMembership.id,
        joinDate: newMembership.joinDate,
        status: newMembership.status
      }
    });

  } catch (error) {
    console.error('تفاصيل الخطأ:', error);
    
    // معالجة أخطاء قاعدة البيانات
    let errorMessage = 'حدث خطأ أثناء التسجيل';
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      errorMessage = 'معلومات المستخدم أو الجمعية غير صالحة';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : null
    });
  }
});

// استرجاع الجمعيات التي انضم إليها المستخدم
router.get('/my-associations', auth, async (req, res) => {
  try {
    const user = req.user;
    console.log("my-associations was hit!");

    const userWithAssociations = await User.findByPk(user.id, {
      include: [{
        model: Association,
        as: 'Associations',
        through: { attributes: ['joinDate'] },
        attributes: ['id', 'name', 'monthlyAmount', 'duration', 'startDate', 'status']
      }]
    });

    if (!userWithAssociations) {
      return res.status(404).json({ 
        success: false,
        message: 'المستخدم غير موجود' 
      });
    }

    const formattedData = userWithAssociations.Associations.map(association => ({
      id: association.id,
      name: association.name,
      monthlyAmount: association.monthlyAmount,
      duration: association.duration,
      startDate: association.startDate,
      status: association.status,
      joinDate: association.UserAssociation.joinDate
    }));

    res.json({ success: true, data: formattedData });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في الاسترجاع',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

module.exports = router;