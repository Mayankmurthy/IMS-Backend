const express = require('express');
const User = require('../models/User'); 
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware'); 

const router = express.Router();

router.get('/my-stats', authenticateToken, authorizeRoles('agent'), async (req, res) => {
    try {
        const agentUsername = req.user.username;
        const agentId = req.user.id; 
        const formattedAgentName = `${agentUsername.split('@')[0]} (Agent)`;
        const agentUser = await User.findById(agentId);
        if (!agentUser) {
            return res.status(404).json({ message: "Agent profile not found." });
        }
        const customersRegisteredByMe = await User.countDocuments({
            registeredBy: formattedAgentName,
            role: 'user'
        });

        const assignedPoliciesCount = agentUser.assignedPolicies ? agentUser.assignedPolicies.length : 0;
        const targetCustomers = agentUser.targetCustomer || 0; 
        const achievedCustomers = agentUser.achievedAmount || 0; 

        const recentActivities = []; 

        res.status(200).json({
            customersRegisteredByMe,
            assignedPolicies: assignedPoliciesCount,
            targetCustomers,
            achievedCustomers,
            recentActivities 
        });

    } catch (error) {
        console.error('Error fetching agent dashboard stats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;