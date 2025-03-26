const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
  amount: { type: DataTypes.FLOAT, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  associationId: { type: DataTypes.INTEGER, allowNull: false },
  paymentDate: { type: DataTypes.DATE, allowNull: false }
  // ... الحقول الأخرى
});

module.exports = Payment;