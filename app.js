require('dotenv').config();

const express = require('express');
const app = express();
const sequelize = require('./config/db');
const cors = require('cors');

// استيراد الرواتر بشكل صحيح
const authRoutes = require('./routes/auth');
const authTestRoutes = require('./routes/auth_test');
const associationRoutes = require('./routes/associations');
const userRoutes = require('./routes/userData');
const paymentRoutes = require('./routes/payments');

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth-test', authTestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/associations', associationRoutes);
app.use('/api/payments', paymentRoutes);

sequelize.sync({ force: false }).then(() => {
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
}).catch(err => console.error('Sync failed:', err));;