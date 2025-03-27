const express = require('express');
const router = express.Router();
const { User, Association, UserAssociation } = require('../models');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');

router.get('/wallet', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({error:'User not found'});
        }
        res.json({ walletBalance: user.walletBalance });
    } catch (error) {
        console.error(error);
        res.status(500).json({error:'Server error'});
    }
});

router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'fullName', 'nationalId', 'phone', 'profileImage']
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/uploads/:file', auth, async (req, res) => {
    try {
        const { file } = req.params;
        res.sendFile(file, { 
            root: 'uploads'
         });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;