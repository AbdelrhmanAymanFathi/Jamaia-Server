const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { Association, UserAssociation } = require('./association');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  // ... جميع الحقول المطلوبة
  fullName: { type: DataTypes.STRING, allowNull: false },
  nationalId: { type: DataTypes.STRING, unique: true },
  phone: { type: DataTypes.STRING, unique: true },
  address: DataTypes.TEXT,
  profileImage: DataTypes.STRING,
  salarySlipImage: DataTypes.STRING,
  walletBalance: { type: DataTypes.FLOAT, defaultValue: 0 },
  role: { type: DataTypes.ENUM('admin', 'user'), defaultValue: 'user' },
  password: { type: DataTypes.STRING, allowNull: false }
});

User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
});

module.exports = User;