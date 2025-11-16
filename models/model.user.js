const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(this.password, salt);
      this.password = hashed;
    } catch (error) {
      return next(error);
    }
  }

  next();
});

module.exports = mongoose.model("User", userSchema);
