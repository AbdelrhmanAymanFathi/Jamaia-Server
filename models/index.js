// models/index.js
const User = require('./user');
const { Association, UserAssociation } = require('./association');

// تحديد العلاقات بعد استيراد جميع الموديلات
Association.belongsToMany(User, { through: UserAssociation, as: 'Users' });
User.belongsToMany(Association, { through: UserAssociation, as: 'Associations' });

module.exports = { User, Association, UserAssociation };
