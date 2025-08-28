const mongoose = require("mongoose");
 
const policySchema = new mongoose.Schema({
  policyName: {
    type: String,
    required: true,
    trim: true,
  },
  policyDescription: {
    type: String,
    required: true,
    trim: true,
  },
  premium: {
    type: String, 
    required: true,
    trim: true,
  },
  policySpecs: {
    type: [String], 
    default: [],
  },
  category: {
    type: String,
    enum: ["auto", "life"],
    required: true,
  },
  customer: {
    type: String,
    default: "--",
  },
  agent: {
    type: String,
    default: "--",
  },
  displayId: {
    type: String,
    unique: true, 
    required: true,
  },
  validUntil: { type: Date, required: true },
}, { timestamps: true });
 
policySchema.pre('validate', function(next) {
  if (this.isNew && (!this.displayId || this.displayId === null || this.displayId.trim() === '')) {
    this.displayId = `POL-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
  next(); 
});

 
module.exports = mongoose.model("Policy", policySchema);
