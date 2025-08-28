const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 }, 
}, { timestamps: true });

const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = Feedback;
