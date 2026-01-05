require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const Task = require("./models/model.task");
const User = require("./models/model.user");
const Team = require("./models/model.team");
const Project = require("./models/model.project");
const Member = require("./models/model.member");
const { initializeDatabase } = require("./db/db.connect");
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

app.use(async (req, res, next) => {
  try {
    await initializeDatabase(); // ensures DB is connected before handling request
    next();
  } catch (err) {
    res.status(500).json({ message: "Database connection failed", error: err });
  }
});

// initializeDatabase();

// mongoose.connection.on("connected", () => console.log("✅ DB connected!"));
// mongoose.connection.on("error", (err) =>
//   console.error("❌ DB connection error:", err)
// );

const JWT_SECRET = process.env.JWT_SECRETKEY;

app.get("/", async (req, res) => {
  res.send("Workviyo backend is running successfully");
});

//signup
// app.post("/auth/signup", async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     if (!name || !email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res
//         .status(400)
//         .json({ message: "Email already exists, please Login" });
//     }

//     const newUser = new User(req.body);
//     const savedUser = await newUser.save();

//     const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, {
//       expiresIn: "24h",
//     });

//     res.status(200).json({
//       message: "User added successfully.",
//       user: savedUser,
//       token,
//     });

//     //console.log(req.body);
//   } catch (error) {
//     //console.log(error);
//     res.status(500).json({ message: "Adding user Failed.", error });
//   }
// });
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email already exists, please Login" });
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();

    const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.status(200).json({
      message: "User added successfully.",
      user: savedUser,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Adding user Failed.", error });
  }
});

// //login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email }).select("+password");
    if (!existingUser)
      return res.status(400).json({ message: "Invalid email." });

    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch)
      return res.status(401).json({ message: "Incorrect password." });

    const token = jwt.sign({ id: existingUser._id }, JWT_SECRET, {
      expiresIn: "24h",
    });
    res
      .status(200)
      .json({ message: "Login Successful", token, user: existingUser });
  } catch (error) {
    console.error("LOGIN ERROR:", error); // 🔥 Add this
    res.status(500).json({ message: "User Login Failed.", error });
  }
});

// app.post("/auth/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const existingUser = await User.findOne({ email }).select("+password");

//     if (!existingUser) {
//       return res.status(400).json({ message: "Invalid email." });
//     }

//     const isMatch = await bcrypt.compare(password, existingUser.password);

//     if (!isMatch) {
//       return res.status(401).json({ message: "Incorrect password." });
//     }
//     const token = jwt.sign({ id: existingUser._id }, JWT_SECRET, {
//       expiresIn: "24h",
//     });

//     res
//       .status(200)
//       .json({ message: "Login Successful", token, user: existingUser });
//   } catch (error) {
//     //console.log(error);
//     res.status(500).json({ message: "User Login Failed.", error });
//   }
// });

//verify token
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.userId = decoded.id; // THIS EXISTS
    next();
  });
};

//get user with token
app.get("/auth/me", verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

//get users
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.send(users);
  } catch (error) {
    // console.log(error);
    res.status(500).json("Internal server error");
  }
});

//get members
app.get("/members", verifyJWT, async (req, res) => {
  try {
    const members = await Member.find();
    return res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

//post member
app.post("/members", async (req, res) => {
  try {
    const newMember = new Member(req.body);
    const savedMember = await newMember.save();

    return res.status(201).json({
      message: "Member added successfully",
      member: savedMember,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

//delete member
app.delete("/members/:id", async (req, res) => {
  try {
    const deletedMember = await Member.findByIdAndDelete(req.params.id);

    if (!deletedMember) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.status(200).json({ message: "Member deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

// add task
app.post("/tasks", verifyJWT, async (req, res) => {
  try {
    //console.log("TASK BODY:", req.body);

    const task = await Task.create({
      name: req.body.name,
      project: req.body.project,
      team: req.body.team,
      owners: Array.isArray(req.body.owners)
        ? req.body.owners
        : [req.body.owners],
      timeToComplete: Number(req.body.timeToComplete),
      priority: req.body.priority || "Medium",
      status: req.body.status || "To Do",
      tags: req.body.tags || [],
    });

    const populatedTask = await Task.findById(task._id)
      .populate("owners", "name")
      .populate("team", "name")
      .populate("project", "name");

    res.status(201).json(populatedTask);
  } catch (error) {
    // console.error("CREATE TASK ERROR:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
});

// get tasks
app.get("/tasks", verifyJWT, async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("owners", "name")
      .populate("team", "name")
      .populate("project", "name");

    res.status(200).json(tasks);
  } catch (error) {
    // console.error("GET TASKS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// update task
app.put("/tasks/:id", verifyJWT, async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        timeToComplete: Number(req.body.timeToComplete),
      },
      { new: true }
    )
      .populate("owners", "name")
      .populate("team", "name")
      .populate("project", "name");

    res.status(200).json(updatedTask);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: "Failed to update task" });
  }
});

// delete task
app.delete("/tasks/:id", verifyJWT, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task" });
  }
});

//new team
app.post("/teams", async (req, res) => {
  try {
    const { name } = req.body;
    const existingTeam = await Team.findOne({ name });

    if (existingTeam) {
      return res.status(400).json({ message: "Team already exists" });
    }

    const newTeam = new Team(req.body);
    await newTeam.save();

    const populatedTeam = await Team.findById(newTeam._id).populate("members");

    res.status(201).json({
      message: "New team created successfully",
      team: populatedTeam,
    });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: "Team creation failed", error });
  }
});

// update team
app.put("/teams/:id", async (req, res) => {
  try {
    const { name, members } = req.body;

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(Array.isArray(members) && { members }), // ✅ FULL REPLACE
      },
      { new: true }
    ).populate("members");

    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ message: "Failed to update team", error });
  }
});

app.delete("/teams/:id", async (req, res) => {
  try {
    const deletedTeam = await Team.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Team deleted successfully", deletedTeam });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: "Failed to delete team." });
  }
});

//get team
app.get("/teams", verifyJWT, async (req, res) => {
  try {
    const teams = await Team.find().populate("members");
    res.send(teams);
  } catch (error) {
    //console.log(error);
    res.status(500).json("Internal server error");
  }
});

//new project
app.post("/projects", async (req, res) => {
  try {
    const { name } = req.body;
    const existingProject = await Project.findOne({ name });

    if (existingProject) {
      return res.status(400).json({ message: "project already exists" });
    }

    const newProject = new Project(req.body);
    const savedProject = await newProject.save();

    // return the updated project
    const projects = await Project.find();
    res.status(201).json({
      message: "New project added successfully",
      projects,
    });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: "project creation failed" });
  }
});

//get project
app.get("/projects", verifyJWT, async (req, res) => {
  const { name } = req.query;
  const filter = {};

  if (name) {
    filter.name = name;
  }

  try {
    const projects = await Project.find(filter);
    res.send(projects);
  } catch (error) {
    // console.log(error);
    res.status(500).json("Internal server error");
  }
});

// update project by id
app.put("/projects/:id", async (req, res) => {
  try {
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    const projects = await Project.find();
    res.status(200).json({ message: "Project updated", projects });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: "project update failed" });
  }
});

// delete project by id
app.delete("/projects/:id", async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    const projects = await Project.find();
    res.status(200).json({ message: "Project deleted", projects });
  } catch (error) {
    //console.log(error);
    res.status(500).json({ message: "project deletion failed" });
  }
});

//last week reports
app.get("/report/last-week", async (req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const tasks = await Task.aggregate([
      {
        $match: {
          updatedAt: { $gte: oneWeekAgo },
          status: "Completed",
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%d-%m-%Y", date: "$updatedAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.send(tasks);
  } catch (error) {
    //console.log(error);
    res.status(500).json({ message: "error while fetching report last-week" });
  }
});

//pending reports
app.get("/report/pending", async (req, res) => {
  try {
    const tasks = await Task.find({ status: { $ne: "Completed" } });
    const simplifiedTasks = tasks.map(({ name, timeToComplete }) => ({
      name,
      timeToComplete,
    }));

    res.send(simplifiedTasks);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: "error while fetching pending reports" });
  }
});

//closed tasks report
app.get("/report/closed-tasks", async (req, res) => {
  try {
    const groupByProject = await Task.aggregate([
      {
        $match: { status: "Completed" },
      },
      {
        $group: {
          _id: "$project",
          count: { $sum: 1 },
        },
      },
    ]);

    const groupByTeam = await Task.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: "$team",
          count: { $sum: 1 },
        },
      },
    ]);

    const groupByOwners = await Task.aggregate([
      { $match: { status: "Completed" } },
      { $unwind: { path: "$owners" } },
      {
        $group: {
          _id: "$owners",
          count: { $sum: 1 },
        },
      },
    ]);

    const byTeam = await Team.populate(groupByTeam, {
      path: "_id",
      select: "name",
    });
    const byProject = await Project.populate(groupByProject, {
      path: "_id",
      select: "name",
    });
    const byOwners = await User.populate(groupByOwners, {
      path: "_id",
      select: "name",
    });

    res.status(200).json({
      byOwners,
      byTeam,
      byProject,
    });
  } catch (error) {
    //console.log(error);
    res
      .status(500)
      .json({ message: "error while fetching report of closed tasks" });
  }
});

module.exports = app;

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log("Server is up and running on", port);
});
