const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Fetch
router.get('/', async (req, res) => {
    try {
        const customers = await User.find({
            username: { $ne: 'admin', $not: { $regex: '@agent' } }
        });
        res.status(200).json(customers);
    } catch (error) {
        res.status(500).json({ error: "Error fetching customers", details: error.message });
    }
});

// create
router.post('/', async (req, res) => {
    try {
        const { username, email, dateofbirth, mobile, password, registeredBy } = req.body;

        const existingEmail = await User.findOne({ email });

        if (existingEmail) {
            return res.status(409).json({ error: "Email already exists." });
        }

        const newCustomer = new User({
            username,
            email,
            dateofbirth,
            mobile,
            password,
            registeredBy: registeredBy || 'Self' 
        });
        await newCustomer.save();
        res.status(201).json({ message: "Customer added successfully!", customer: newCustomer });

    } catch (error) {
        res.status(500).json({ error: "Error adding customer", details: error.message });
    }
});

// update
router.put('/:id', async (req, res) => {
    try {
        const { registeredBy, ...updateData } = req.body;
        const updatedCustomer = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedCustomer) return res.status(404).json({ error: "Customer not found" });

        res.status(200).json({ message: "Customer updated successfully!", customer: updatedCustomer });
    } catch (error) {
        res.status(500).json({ error: "Error updating customer", details: error.message });
    }
});

// delete
router.delete('/:id', async (req, res) => {
    try {
        const deletedCustomer = await User.findByIdAndDelete(req.params.id);
        if (!deletedCustomer) return res.status(404).json({ error: "Customer not found" });

        res.status(200).json({ message: "Customer deleted successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting customer", details: error.message });
    }
});

module.exports = router;