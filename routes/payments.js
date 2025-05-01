const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Payment = require('../models/payment');
const User = require('../models/user');
const { Association, UserAssociation } = require('../models/association');
const sequelize = require('../config/db');
const { Op } = require('sequelize');

router.post('/pay', auth, async (req, res) => {
  const transaction = await sequelize.transaction(); // بدء معاملة
  
  try {
    // التحقق من البيانات المدخلة
    const { associationId, amount } = req.body;
    
    if (!associationId || !amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'معرّف الجمعية والمبلغ مطلوبان'
      });
    }

    // التحقق من وجود الجمعية
    const association = await Association.findByPk(associationId, { transaction });
    if (!association) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'الجمعية غير موجودة'
      });
    }

    if (isNaN(amount)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'المبلغ يجب أن يكون رقمًا صحيحًا'
      });
    }

    const userAssociation = await UserAssociation.findOne({
      where: {
        userId: req.user.id,
        associationId: associationId
      }
    });

    if (!userAssociation) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير مرتبط بهذه الجمعية'
      });
    }

    // التحقق من رصيد المحفظة
    const user = await User.findByPk(req.user.id, { transaction });
    if (user.walletBalance < amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'الرصيد غير كافي'
      });
    }

    const remainingAmount = userAssociation.remainingAmount;
    if (remainingAmount === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'تم دفع المبلغ كاملاً لا داعي للدفع مرة اخري'
      });
    } else if (remainingAmount < amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `المبلغ المتبقي للدفع ${remainingAmount} جنيه فقط`
      });
    } 

    // إنشاء الدفع
    const payment = await Payment.create({
      userId: req.user.id,
      associationId: associationId,
      amount: amount,
      paymentDate: new Date()
    }, { transaction });

    // تحديث رصيد المحفظة
    await User.update(
      { walletBalance: sequelize.literal(`walletBalance - ${amount}`) },
      {
        where: { id: req.user.id },
        transaction
      }
    );

    await userAssociation.update(
      { remainingAmount: userAssociation.remainingAmount - amount },
      { transaction }
    );

    await transaction.commit(); // تأكيد المعاملة
    
    res.status(201).json({
      success: true,
      message: 'تمت عملية الدفع بنجاح',
      payment: {
        id: payment.id,
        amount: payment.amount,
        date: payment.paymentDate
      }
    });

  } catch (error) {
    await transaction.rollback(); // تراجع عن المعاملة في حالة الخطأ
    console.error('خطأ في الدفع:', error);
    
    res.status(500).json({
      success: false,
      error: 'فشل في عملية الدفع',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/pay/suggest', auth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        error: 'المبلغ غير صالح أو مفقود'
      });
    }

    const inputAmount = parseFloat(amount);
    const lowerBound = inputAmount - 1000;
    const upperBound = inputAmount + 1000;

    const suggestions = await Association.findAll({
      where: {
        monthlyAmount: {
          [Op.between]: [lowerBound, upperBound]
        },
        status: 'pending'
      },
      order: [['monthlyAmount', 'ASC']],
      limit: 10
    });

    if (suggestions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'لا توجد جمعيات قريبة من هذا المبلغ',
        suggestions: []
      });
    }

    return res.status(200).json({
      success: true,
      message: `تم العثور على جمعيات بقيمة قريبة من ${inputAmount} جنيه`,
      suggestions: suggestions.map(a => ({
        id: a.id,
        name: a.name,
        monthlyAmount: a.monthlyAmount,
        duration: a.duration,
        type: a.type
      }))
    });

  } catch (error) {
    console.error('خطأ في اقتراح الدفع:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في اقتراح الدفع',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


router.post('/topup', auth, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'المبلغ مطلوب ويجب أن يكون رقمًا صحيحًا أكبر من صفر'
      });
    }

    const user = await User.findByPk(req.user.id, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    const updatedUser = await user.update(
      { walletBalance: sequelize.literal(`walletBalance + ${amount}`) },
      { transaction }
    );

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'تمت عملية الشحن بنجاح',
      newBalance: updatedUser.walletBalance
    });

  } catch (error) {
    await transaction.rollback();
    console.error('خطأ في الشحن:', error);

    res.status(500).json({
      success: false,
      error: 'فشل في عملية الشحن',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;