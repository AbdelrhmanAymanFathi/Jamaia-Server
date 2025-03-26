const cron = require('node-cron');
const { UserAssociation } = require('../models/user');
const { Association } = require('../models/association');

cron.schedule('0 0 1 * *', async () => { // يوم الأول من كل شهر
  const associations = await Association.findAll();
  
  associations.forEach(async (association) => {
    const members = await UserAssociation.findAll({
      where: { associationId: association.id }
    });
    
    // اختيار العضو الذي سيأخذ الدور
    const nextMember = members.find(m => !m.hasReceived);
    
    if (nextMember) {
      const total = association.monthlyAmount * members.length;
      
      await User.increment('walletBalance', {
        by: total,
        where: { id: nextMember.userId }
      });
      
      await nextMember.update({ hasReceived: true });
    }
  });
});