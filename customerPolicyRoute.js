const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Policy = require('../models/Policy');
const { sendEmail } = require('../services/emailSender'); 
 
router.get('/all-purchased-policies', async (req, res) => {
    try {
        const usersWithPolicies = await User.find({})
            .select('username email mobile purchasedPolicies')
            .populate({
                path: 'purchasedPolicies',
                select: 'policyName policyDescription premium policySpecs displayId validUntil agent'
            });
 
        const customersWithPolicies = usersWithPolicies.filter(user => user.purchasedPolicies && user.purchasedPolicies.length > 0);
 
        res.status(200).json(customersWithPolicies);
    } catch (error) {
        console.error('Error fetching all users with purchased policies:', error);
        res.status(500).json({ message: 'Error fetching all users with purchased policies', error: error.message });
    }
});
 
router.get("/:username", async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username })
            .populate("purchasedPolicies")
            .select('+claims');
 
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const policiesWithClaimStatus = user.purchasedPolicies.map(policy => {
            const policyObject = policy.toObject();
            const claimsForThisPolicy = user.claims.filter(
                claim => claim.policyNumber === policyObject.displayId
            ).sort((a, b) => b.submittedAt - a.submittedAt);
 
            let claimStatus = "Not Claimed";
 
            if (claimsForThisPolicy.length > 0) {
                claimStatus = claimsForThisPolicy[0].status;
            }
 
            return {
                ...policyObject,
                claimStatus: claimStatus
            };
        });
 
 
        const userResponse = user.toObject();
        delete userResponse.claims;
 
        res.status(200).json({
            ...userResponse,
            purchasedPolicies: policiesWithClaimStatus
        });
 
    } catch (error) {
        console.error("Error fetching user details:", error);
        res.status(500).json({ message: "Server error fetching user details.", error: error.message });
    }
});
 
router.post('/:username/purchase-policy', async (req, res) => {
    const { username } = req.params;
    const { policyId } = req.body;
 
    try {
        const customer = await User.findOne({ username });
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found.' });
        }
 
        const policy = await Policy.findById(policyId);
        if (!policy) {
            return res.status(404).json({ message: 'Policy not found.' });
        }
 
        if (customer.purchasedPolicies.includes(policyId)) {
            return res.status(409).json({ message: `Policy "${policy.policyName}" is already in your purchased policies.` });
        }
 
        customer.purchasedPolicies.push(policyId);
        await customer.save(); 
 
        const notificationMessage = `You have successfully purchased the policy: "${policy.policyName}" (ID: ${policy.displayId}).`;
        customer.notifications.push({
            message: notificationMessage,
            type: 'purchase'
        });
        await customer.save(); 
 
        if (customer.email && customer.email !== '') {
            const purchaseSubject = `Congratulations! Your Policy Purchase Confirmation - ${policy.policyName}`;
            const purchaseHtml = `
            <p>Dear ${customer.username},</p>
            <p>We're excited to confirm your recent policy purchase!</p>
            <p>You have successfully purchased the policy: <strong>"${policy.policyName}"</strong> (ID: ${policy.displayId}).</p>
            <p><strong>Policy Details:</strong></p>
            <ul>
            <li><strong>Policy Name:</strong> ${policy.policyName}</li>
            <li><strong>Description:</strong> ${policy.policyDescription}</li>
            <li><strong>Premium:</strong> ${policy.premium}</li>
            <li><strong>Valid Until:</strong> ${new Date(policy.validUntil).toLocaleDateString('en-GB')}</li>
            <li><strong>Policy ID:</strong> ${policy.displayId}</li>
            </ul>
            <p>Thank you for choosing us for your insurance needs. We are here to help protect what matters most to you.</p>
            <p>Sincerely,<br>The Insurance Team</p>
            `;
            await sendEmail(customer.email, purchaseSubject, purchaseHtml);
        } else {
            console.warn(`[EMAIL_SKIP] Customer ${username} has no email address. Skipped purchase confirmation email.`);
        }
 
        res.status(200).json({ message: 'Policy purchased successfully!', policy });
 
    } catch (error) {
        console.error('Error purchasing policy:', error);
        res.status(500).json({ message: 'Server error during policy purchase', error: error.message });
    }
});
 
router.get("/", async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
 
router.get('/:username/notifications', async (req, res) => {
    const { username } = req.params;
 
    try {
        const customer = await User.findOne({ username });
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found.' });
        }
 
        const purchasedPolicies = await Promise.all(
            customer.purchasedPolicies.map(async (policyId) => {
                const policy = await Policy.findById(policyId);
                return policy;
            })
        );
 
        const validPurchasedPolicies = purchasedPolicies.filter(p => p !== null);
 
        const expirationNotifications = [];
 
        for (const policy of validPurchasedPolicies) {
            const validUntilDate = new Date(policy.validUntil);
            const now = new Date();
            const diffDays = Math.ceil((validUntilDate - now) / (1000 * 60 * 60 * 24));

            if (diffDays <= 30 && diffDays > 0) {
                const message = `Your policy "${policy.policyName}" (ID: ${policy.displayId}) is expiring in ${diffDays} days.`;
 
                if (customer.email && customer.email !== '') {
                    const expirationSubject = `Reminder: Your Policy "${policy.policyName}" is Expiring Soon!`;
                    const expirationHtml = `
                    <p>Dear ${customer.username},</p>
                    <p>${message}</p>
                    <p>We wanted to remind you that your policy <strong>"${policy.policyName}"</strong> (ID: ${policy.displayId}) is expiring soon. Its validity ends on ${new Date(policy.validUntil).toLocaleDateString('en-GB')}.</p>
                    <p>Please consider renewing your policy to ensure continuous coverage and avoid any lapse in your benefits.</p>
                    <p>If you have already renewed or have any questions, please feel free to contact us.</p>
                    <p>Sincerely,<br>The Insurance Team</p>
                    `;
                    await sendEmail(customer.email, expirationSubject, expirationHtml);
                } else {
                    console.warn(`[EMAIL_SKIP] Customer ${username} has no email address. Skipped expiration reminder email.`);
                }
 
                expirationNotifications.push({
                    id: policy._id,
                    message: message,
                    timestamp: new Date().toISOString(),
                    type: 'expiration'
                });
            }
        }
 
        const allNotifications = [
            ...customer.notifications.map(notif => ({
                id: notif._id,
                message: notif.message,
                timestamp: notif.timestamp,
                isRead: notif.isRead,
                type: notif.type
            })),
            ...expirationNotifications
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
 
        res.status(200).json(allNotifications);
 
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Server error fetching notifications', error: error.message });
    }
});
 
module.exports = router;