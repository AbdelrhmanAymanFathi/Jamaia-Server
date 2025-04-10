const { DataTypes } = require('sequelize');
const User = require('./user');
const sequelize = require('../config/db');

const Association = sequelize.define('Association', {
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  monthlyAmount: { type: DataTypes.FLOAT, allowNull: false },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'pending'),
    defaultValue: 'active'
  },
  startDate: { type: DataTypes.DATE, allowNull: false },
  duration: { type: DataTypes.INTEGER }, // عدد الأشهر
  collectionOrderType: {
    type: DataTypes.ENUM('lottery', 'fixed'),
    defaultValue: 'lottery'
  }
});

const UserAssociation = sequelize.define('UserAssociation', {
  joinDate: DataTypes.DATE,
  status: DataTypes.STRING,
  remainingAmount: DataTypes.FLOAT,
  collectionOrder: {
    type: DataTypes.INTEGER
  }
});

module.exports = { Association, UserAssociation };