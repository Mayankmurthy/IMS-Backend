const express = require("express");
const router = express.Router();
const User = require("../models/User"); 
const Policy = require("../models/Policy");

router.get("/dashboard", async (req, res) => {
  try {
    const totalPolicies = await Policy.countDocuments(); 

    const totalAgents = await User.countDocuments({ username: /@agent/ }); 

    const totalCustomers = await User.countDocuments({ 
      username: { $not: { $regex: "@agent" } }, 
      username: { $ne: "admin" } 
    });

    const pendingApprovals = await User.aggregate([
      { $unwind: "$claims" },
      { $match: { "claims.status": "Pending" } },
      { $count: "totalPending" }
    ]);

    res.json({
      policies: totalPolicies,
      agents: totalAgents,
      customers: totalCustomers,
      approvals: pendingApprovals.length > 0 ? pendingApprovals[0].totalPending : 0,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
