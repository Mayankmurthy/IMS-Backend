const express = require('express');
const User = require('../models/User');
const router = express.Router();
 
//fetch
router.get('/', async (req, res) => {
    try {
        const agents = await User.find({ username: { $regex: '@agent' } });
        res.status(200).json(agents);
    } catch (error) {
        res.status(500).json({ error: "Error fetching agents", details: error.message });
    }
});
 
//create
router.post('/', async (req, res) => {
    try {
        const { username, email, mobile, status, password } = req.body;
        const newAgent = new User({ username, email, mobile, status, password });
 
        await newAgent.save();
        res.status(201).json({ message: "Agent added successfully!", agent: newAgent });
    } catch (error) {
        res.status(500).json({ error: "Error adding agent", details: error.message });
    }
});
 
//update
router.put('/:id', async (req, res) => {
    try {
        const updatedAgent = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedAgent) return res.status(404).json({ error: "Agent not found" });
 
        res.status(200).json({ message: "Agent updated successfully!", agent: updatedAgent });
    } catch (error) {
        res.status(500).json({ error: "Error updating agent", details: error.message });
    }
});
 
//delete 
router.delete('/:id', async (req, res) => {
    try {
        const deletedAgent = await User.findByIdAndDelete(req.params.id);
        if (!deletedAgent) return res.status(404).json({ error: "Agent not found" });
 
        res.status(200).json({ message: "Agent deleted successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting agent", details: error.message });
    }
});
 
module.exports = router;