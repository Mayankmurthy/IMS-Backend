const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config(); 

const app = express();

app.use(express.json());
const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "username"], 
};

app.use(cors(corsOptions));
const localHostUri = "mongodb://localhost:27017/Insure";
mongoose.connect(localHostUri, { 
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.error("MongoDB Connection Error:", err));


const feedbackRoutes = require("./routes/customerFeedbackRoute");
const policyRoutes = require("./routes/policyManagementRoute");
const userRoutes = require("./routes/customerPolicyRoute"); 
const authRoutes = require("./routes/authRoute"); 
const claimRoutes = require("./routes/claimManagementRoute"); 
const dashboardRoutes = require("./routes/dashboardRoute"); 
const storedPolicyRoutes = require("./routes/policyListRoute"); 
const customerRoutes = require("./routes/customerManagementRoute"); 
const agentRoutes = require("./routes/agentManagementRoute"); 
const assignPolicyRoutes = require("./routes/policyAssignmentRoute");
const fetchedPolicyRoutes = require("./routes/storedPolicyRoute"); 
const activityRoutes = require("./routes/activityRoute"); 
const agentDashboardRoutes = require("./routes/agentDashboardRoute");
const { assign } = require("nodemailer/lib/shared");



app.use("/api", authRoutes); 
app.use("/api/activity", activityRoutes); 
app.use("/api/feedback", feedbackRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/users", userRoutes); 
app.use("/api/claims", claimRoutes); 
app.use("/api/admin", dashboardRoutes); 
app.use("/api/home", storedPolicyRoutes); 
app.use("/api/customers", customerRoutes); 
app.use("/api/agents", agentRoutes); 
app.use("/api/assignagents",assignPolicyRoutes);
app.use("/api/fetchpolicies", fetchedPolicyRoutes);
app.use("/api/agent/dashboard", agentDashboardRoutes);


app.listen(5000, () => console.log(`Server running on port 5000`));