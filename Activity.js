const mongoose = require("mongoose");

const recentActivitySchema = new mongoose.Schema({
  text: { type: String, required: true }, 
  timestamp: { type: Date, default: Date.now }
});

const RecentActivity = mongoose.model("RecentActivity", recentActivitySchema);
module.exports = RecentActivity;
