const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    dateofbirth: { type: Date },
    mobile: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    file: { type: String },
    role: { type: String, default: 'user', immutable: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    purchasedPolicies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Policy', default: [] }],
    claims: {
        type: [{
            policyNumber: { type: String, required: true },
            incidentDate: { type: Date, required: true },
            incidentDetails: { type: String, required: true },
            amount: { type: Number, required: true },
            supportingDocuments: { type: [String], default: [] },
            status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Under Review', 'Settled'], default: 'Pending' },
            submittedAt: { type: Date, default: Date.now },
            claimId: { type: String, unique: true, required: true }
        }],
        default: []
    },
    assignedPolicies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Policy', default: [] }],
    notifications: [{
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        isRead: { type: Boolean, default: false },
        type: { type: String, enum: ['purchase', 'expiration'], required: true }
    }],
    registeredBy: { 
        type: String,
        default: 'Self' 
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;