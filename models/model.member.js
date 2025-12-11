const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

module.exports =
  mongoose.models.Member || mongoose.model("Member", memberSchema);
