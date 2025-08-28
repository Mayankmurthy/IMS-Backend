const express = require("express");
const Feedback = require("../models/Feedback"); 

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, email, message, rating } = req.body;
    const feedback = new Feedback({ name, email, message, rating });
    await feedback.save();
    res.status(201).json({ message: "Feedback saved successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save feedback" });
  }
});


router.get("/", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 }); 
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve feedback" });
  }
});

module.exports = router;
