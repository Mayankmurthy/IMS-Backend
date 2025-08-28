const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Policy = require('../models/Policy');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../services/emailSender'); 


router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated." });
        }

        const { policyNumber, incidentDate, incidentDetails, amount, supportingDocuments } = req.body;

        if (!policyNumber || !incidentDate || !incidentDetails || amount === undefined || amount === null) {
            return res.status(400).json({ error: "Missing required claim fields." });
        }

        const user = await User.findById(userId).populate('purchasedPolicies').select('+claims');
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const purchasedPolicy = user.purchasedPolicies.find(p => p.displayId === policyNumber);
        if (!purchasedPolicy) {
            return res.status(400).json({ error: "The provided policy number is not associated with your account." });
        }

        const today = new Date();
        const policyExpiryDate = new Date(purchasedPolicy.validUntil);
        policyExpiryDate.setHours(23, 59, 59, 999);

        if (today > policyExpiryDate) {
            return res.status(400).json({ error: "This policy has expired and claims cannot be filed against it." });
        }

        const existingActiveClaim = user.claims.find(
            claim => claim.policyNumber === policyNumber &&
                     ['Pending', 'Under Review'].includes(claim.status)
        );

        if (existingActiveClaim) {
            return res.status(409).json({
                error: `You already have an active claim (${existingActiveClaim.status}) for policy ${policyNumber}. Please wait for it to be processed.`,
                claimId: existingActiveClaim.claimId
            });
        }

        const newClaim = {
            claimId: uuidv4(),
            policyNumber,
            incidentDate: new Date(incidentDate),
            incidentDetails,
            amount: parseFloat(amount),
            supportingDocuments: supportingDocuments || [],
            status: 'Pending',
            submittedAt: new Date(),
        };

        user.claims.push(newClaim);
        await user.save();

        const userEmail = user.email;
        const subject = 'Your Claim Has Been Submitted Successfully!';
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                    .header { background-color: #f8f8f8; padding: 15px; text-align: center; border-bottom: 1px solid #eee; }
                    .content { padding: 20px; }
                    .footer { font-size: 0.9em; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; }
                    .highlight { font-weight: bold; color: #0056b3; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Claim Submission Confirmation</h2>
                    </div>
                    <div class="content">
                        <p>Dear <span class="highlight">${user.username}</span>,</p>
                        <p>Your claim for policy number <span class="highlight">${policyNumber}</span> has been successfully submitted.</p>
                        <p>Your unique **Claim ID** is: <span class="highlight">${newClaim.claimId}</span>.</p>
                        <p>Please use this ID for all future correspondence regarding this claim.</p>
                        <p>Our team will review your submission shortly. You will be notified of any status changes.</p>
                        <p>Thank you for choosing our services.</p>
                        <p>Sincerely,<br>The Insurance Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email, please do not reply.</p>
                        <p>&copy; ${new Date().getFullYear()} Your Insurance Company</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        sendEmail(userEmail, subject, htmlContent)
            .then(sent => {
                if (sent) console.log('Claim submission email queued successfully.');
                else console.error('Failed to queue claim submission email.');
            })
            .catch(error => console.error('Error sending claim submission email:', error));
        

        res.status(201).json({ message: 'Claim submitted successfully! An email has been sent with your claim ID.', claimId: newClaim.claimId, status: newClaim.status });

    } catch (error) {
        console.error('Error submitting claim:', error);
        res.status(500).json({ error: 'Failed to submit claim', details: error.message });
    }
});

router.get('/user-policies', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated." });
        }

        const user = await User.findById(userId).populate('purchasedPolicies');

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const policiesForDropdown = user.purchasedPolicies.map(policy => ({
            _id: policy._id,
            displayId: policy.displayId,
            policyName: policy.policyName
        }));

        res.status(200).json({ policies: policiesForDropdown });

    } catch (error) {
        console.error('Error fetching user policies:', error);
        res.status(500).json({ error: 'Failed to fetch user policies', details: error.message });
    }
});


router.get('/all', authenticateToken, authorizeRoles('admin', 'agent'), async (req, res) => {
    try {
        const users = await User.find({}).select('username claims');

        let allClaims = [];
        for (const user of users) {
            for (const claim of user.claims) {
                let policyName = 'N/A';

                const policy = await Policy.findOne({ displayId: claim.policyNumber });
                if (policy) {
                    policyName = policy.policyName;
                }

                allClaims.push({
                    ...claim.toObject(),
                    userId: user._id,
                    username: user.username,
                    policyName: policyName
                });
            }
        }

        allClaims.sort((a, b) => b.submittedAt - a.submittedAt);

        res.status(200).json({ claims: allClaims });
    } catch (error) {
        console.error('Error fetching all claims for review:', error);
        res.status(500).json({ error: "Failed to fetch all claims", details: error.message });
    }
});


router.get('/user', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Authentication failed. Please log in again." });
        }

        const userId = req.user.id;
        const user = await User.findById(userId).select('claims');
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const claimsWithPolicyNames = await Promise.all(user.claims.map(async (claim) => {
            const policy = await Policy.findOne({ displayId: claim.policyNumber });
            return {
                ...claim.toObject(),
                policyName: policy ? policy.policyName : 'N/A'
            };
        }));

        res.status(200).json({ claims: claimsWithPolicyNames.sort((a, b) => b.submittedAt - a.submittedAt) });

    } catch (error) {
        console.error('Error fetching user claims:', error);
        res.status(500).json({ error: 'Failed to fetch user claims', details: error.message });
    }
});



router.get('/:claimId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const requestedClaimId = req.params.claimId;

        const user = await User.findById(userId).select('claims');
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const claim = user.claims.find(c => c.claimId === requestedClaimId);

        if (!claim) {
            return res.status(404).json({ error: "Claim not found for this user." });
        }

        const policy = await Policy.findOne({ displayId: claim.policyNumber });
        const claimWithPolicyName = {
            ...claim.toObject(),
            policyName: policy ? policy.policyName : 'N/A'
        };


        res.status(200).json({ claim: claimWithPolicyName });

    } catch (error) {
        console.error('Error fetching specific claim:', error);
        res.status(500).json({ error: 'Failed to fetch specific claim', details: error.message });
    }
});


router.put('/:claimId/status', authenticateToken, authorizeRoles('admin', 'agent'), async (req, res) => {
    try {
        const { claimId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: "New status is required." });
        }


        const user = await User.findOne({ 'claims.claimId': claimId });

        if (!user) {
            return res.status(404).json({ error: "Claim not found." });
        }

        const claimIndex = user.claims.findIndex(c => c.claimId === claimId);
        if (claimIndex === -1) {
            return res.status(404).json({ error: "Claim not found." });
        }

        const oldStatus = user.claims[claimIndex].status;


        if (oldStatus === status) {
            return res.status(200).json({ message: "Claim status is already " + status + ". No update needed." });
        }

        user.claims[claimIndex].status = status;
        await user.save(); 


        const userEmail = user.email;
        const policyNumber = user.claims[claimIndex].policyNumber; 
        const subject = `Update on Your Claim ${claimId}: Status Changed to ${status}`;
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                    .header { background-color: #f8f8f8; padding: 15px; text-align: center; border-bottom: 1px solid #eee; }
                    .content { padding: 20px; }
                    .footer { font-size: 0.9em; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; }
                    .status-pending { color: orange; font-weight: bold; }
                    .status-approved { color: green; font-weight: bold; }
                    .status-rejected { color: red; font-weight: bold; }
                    .status-under-review { color: #007bff; font-weight: bold; }
                    .status-settled { color: #28a745; font-weight: bold; }
                    .highlight { font-weight: bold; color: #0056b3; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Your Claim Status Has Been Updated</h2>
                    </div>
                    <div class="content">
                        <p>Dear <span class="highlight">${user.username}</span>,</p>
                        <p>This is an update regarding your claim with ID: <span class="highlight">${claimId}</span> for policy number <span class="highlight">${policyNumber}</span>.</p>
                        <p>The status of your claim has been changed from <span class="status-${oldStatus.toLowerCase().replace(/\s/g, '-') || 'default'}">${oldStatus}</span> to <span class="status-${status.toLowerCase().replace(/\s/g, '-') || 'default'}">${status}</span>.</p>
                        <p>Please log in to your account for more details or to view any additional information regarding this status change.</p>
                        <p>If you have any questions, please contact our support team.</p>
                        <p>Sincerely,<br>The Insurance Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email, please do not reply.</p>
                        <p>&copy; ${new Date().getFullYear()} Your Insurance Company</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        sendEmail(userEmail, subject, htmlContent)
            .then(sent => {
                if (sent) console.log('Claim status update email queued successfully.');
                else console.error('Failed to queue claim status update email.');
            })
            .catch(error => console.error('Error sending claim status update email:', error));

        res.status(200).json({ message: "Claim status updated successfully." });
    } catch (error) {
        console.error('Error updating claim status:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message, details: error.errors });
        }
        res.status(500).json({ error: "Failed to update claim status", details: error.message });
    }
});

router.delete('/:claimId', authenticateToken, authorizeRoles('admin', 'agent'), async (req, res) => {
    try {
        const { claimId } = req.params;

        const user = await User.findOneAndUpdate(
            { 'claims.claimId': claimId },
            { '$pull': { 'claims': { claimId: claimId } } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: "Claim not found." });
        }

        res.status(200).json({ message: "Claim deleted successfully." });
    } catch (error) {
        console.error('Error deleting claim:', error);
        res.status(500).json({ error: "Failed to delete claim", details: error.message });
    }
});

module.exports = router;