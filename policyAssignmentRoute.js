const express = require("express");
const router = express.Router();
const User = require("../models/User"); 
const Policy = require("../models/Policy"); 

router.get("/list", async (req, res) => {
    try {
        const agents = await User.find({ username: /@agent/i }, "username"); 
        res.json(agents);
    } catch (error) {
        console.error("Error fetching agents for list:", error);
        res.status(500).json({ message: "Error fetching agents", error });
    }
});

router.post("/assign-policy", async (req, res) => {
    try {
        const { agentUsername, policyId } = req.body;

        const policyExists = await Policy.findById(policyId);
        if (!policyExists) {
            return res.status(404).json({ message: "Policy not found." });
        }

        
        const agent = await User.findOne({ username: agentUsername });
        if (!agent) {
            return res.status(404).json({ message: "Agent not found." });
        }

        
        if (agent.assignedPolicies.includes(policyId)) {
            return res.status(409).json({ message: "Policy is already assigned to this agent." });
        }

        
        agent.assignedPolicies.push(policyId);
        await agent.save();

        res.json({ message: "Policy assigned successfully", agent });
    } catch (error) {
        console.error("Error assigning policy:", error);
        res.status(500).json({ message: "Error assigning policy", error });
    }
});

router.get("/auth/policies", async (req, res) => {
    try {
        const { username } = req.headers;

        if (!username) {
            return res.status(400).json({ message: "Username missing in request headers." });
        }

        const agent = await User.findOne({ username }).populate("assignedPolicies");

        if (!agent) {
            return res.status(404).json({ message: "Agent not found." });
        }

        res.json(agent.assignedPolicies);
    } catch (error) {
        console.error("Error fetching assigned policies for auth:", error);
        res.status(500).json({ message: "Error fetching assigned policies", error });
    }
});

router.get("/agents-with-policies", async (req, res) => {
    try {
        
        const agentsWithPolicies = await User.find(
            { username: /@agent/i }, 
            'username status assignedPolicies' 
        ).populate('assignedPolicies', 'policyName').exec(); 

        res.json(agentsWithPolicies);
    } catch (error) {
        console.error("Error fetching agents with assigned policies:", error);
        res.status(500).json({ message: "Error fetching agents with policies", error });
    }
});

module.exports = router;