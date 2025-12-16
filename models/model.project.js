const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  status: {
    type: String,
    enum: ["To Do", "In Progress", "Completed", "Blocked"],
    default: "To Do",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.Project || mongoose.model("Project", projectSchema);
