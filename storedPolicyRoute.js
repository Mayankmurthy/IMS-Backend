const express = require("express");
const router = express.Router();
const Policy = require("../models/Policy");
 
router.get("/list", async (req, res) => {
  try {
    const policies = await Policy.find();
    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: "Error fetching policies", error });
  }
});
 
module.exports = router;