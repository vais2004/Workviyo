const express = require("express");
const Task = require("./models/model.task");
const User = require("./models/model.user");
const Tag = require("./models/model.tag");
const Team = require("./models/model.team");
const Project = require("./models/model.project");
const { initialiseDatabase } = require("./db/db.connect");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

const corsOptions = {
  origin: "*",
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

initialiseDatabase();

const JWT_SECRET = "workviyoProjectManagement&TaskManagementApp";

app.get("/", async (req, res) => {
  res.send("Workviyo backend is running successfully");
});

//signup
app.post("/auth/signup", async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email already exists, please Login" });
    }

    const newUser = new User(req.body);
    const savedUser = await newUser.save();

    res
      .status(200)
      .json({ message: "User added successfully .", user: savedUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Adding user Failed.", error });
  }
});

//login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email }).select("+password");

    if (!existingUser) {
      return res.status(400).json({ message: "Invalid email." });
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }
    const token = jwt.sign({ existingUser }, JWT_SECRET, { expiresIn: "24h" });

    res
      .status(200)
      .json({ message: "Login Successful", token, user: existingUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "User Login Failed.", error });
  }
});

const port = process.env.PORT;
app.listen(port, () => {
  console.log("Server is up and running on", port);
});

 