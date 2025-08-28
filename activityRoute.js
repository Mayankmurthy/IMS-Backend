const express = require("express");
const router = express.Router();
const Activity = require("../models/Activity");


router.post("/", async (req, res) => {
  try {
    const { text } = req.body;
    const newActivity = new Activity({ text });
    await newActivity.save();
    res.status(201).json(newActivity);
  } catch (error) {
    console.error("Error logging activity:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.get("/", async (req, res) => {
  try {
    const recentActivity = await Activity.find().sort({ timestamp: -1 }).limit(5);
    res.json(recentActivity);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
