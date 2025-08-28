const express = require("express");
const router = express.Router();
const Policy = require("../models/Policy");
 
// fetch all policies
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category) {
      query.category = category;
    }
    const policies = await Policy.find(query);
    res.status(200).json(policies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
 
// fetch by id
router.get("/:id", async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }
    res.status(200).json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
 
// create
router.post("/", async (req, res) => {
  const { policyName, policyDescription, premium, policySpecs, category, customer, agent, validUntil } = req.body;
  console.log("Received policy data:", req.body); // Log the received data for debugging
  if (!policyName || !policyDescription || !premium || !policySpecs || !category || !validUntil) { 
    return res.status(400).json({ message: "Missing required policy fields." });
  }

  const newPolicy = new Policy({
    policyName,
    policyDescription,
    premium,
    policySpecs,
    category,
    customer: customer || "--",
    agent: agent || "--",
    validUntil,
  });

  try {
    const savedPolicy = await newPolicy.save();
    res.status(201).json(savedPolicy);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

 
// Update
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { policyName, policyDescription, premium, policySpecs, customer, agent, validUntil } = req.body;
 
    const updatedPolicy = await Policy.findByIdAndUpdate(
      id,
      {
        policyName,
        policyDescription,
        premium,
        policySpecs,
        customer: customer || "--",
        agent: agent || "--",
        validUntil
      },
      { new: true, runValidators: true } 
    );
 
    if (!updatedPolicy) {
      return res.status(404).json({ message: "Policy not found" });
    }
    res.status(200).json(updatedPolicy);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
 
// DELETE 
router.delete("/:id", async (req, res) => {
  try {
    const deletedPolicy = await Policy.findByIdAndDelete(req.params.id);
    if (!deletedPolicy) {
      return res.status(404).json({ message: "Policy not found" });
    }
    res.status(200).json({ message: "Policy deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
 
module.exports = router;