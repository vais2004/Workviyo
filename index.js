require("dotenv").config();
const express = require("express");
const Task = require("./models/model.task");
const User = require("./models/model.user");
const Tag = require("./models/model.tag");
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

initializeDatabase();

const JWT_SECRET = process.env.JWT_SECRETKEY;

app.get("/", async (req, res) => {
  res.send("Workviyo backend is running successfully");
});

//signup
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

    // NO MANUAL HASHING HERE (schema will handle it)
    const newUser = new User(req.body);
    const savedUser = await newUser.save();

    const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.status(200).json({
      message: "User added successfully.",
      user: savedUser,
      token,
    });

    console.log(req.body); //just for debugging
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
    const token = jwt.sign({ id: existingUser._id }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res
      .status(200)
      .json({ message: "Login Successful", token, user: existingUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "User Login Failed.", error });
  }
});

//verify token
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (error, decoded) => {
    if (error) return res.status(401).json({ message: "Invalid token" });
    req.user = decoded.id;
    next();
  });
};

//get user with token
app.get("/auth/me", verifyJWT, (req, res) => {
  return res.status(200).json(req.user);
});

//get users
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.send(users);
  } catch (error) {
    console.log(error);
    res.status(500).json("Internal server error");
  }
});

//get members
app.get("/members", async (req, res) => {
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

//get tags
app.get("/tags", async (req, res) => {
  try {
    const tags = await Tag.find();
    res.send(tags);
  } catch (error) {
    console.log(error);
    res.status(500).json("Internal server error");
  }
});

//new task
app.post("/tasks", async (req, res) => {
  try {
    const newTask = new Task(req.body);
    newTask
      .save()
      .then((savedTask) => {
        return Task.findById(savedTask._id)
          .populate("owners", "name")
          .populate("team", "name")
          .populate("tags", "name")
          .populate("project", "name");
      })
      .then((populatedTask) => {
        res.status(201).json({
          message: "New task created successfully.",
          task: populatedTask,
        });
      })
      .catch((error) =>
        res.status(500).json({ message: "task creation failed", error })
      );
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "task creation failed." });
  }
});

// get task
app.get("/tasks", async (req, res) => {
  try {
    const { team, owners, project, status, tags, prioritySort, dateSort } =
      req.query;

    const filter = {};

    // format owners: ["RaniKawale"] → ["Rani Kawale"]
    // format owners safely
    const ownerNames = owners
      ? owners
          .split(",")
          .filter(Boolean)
          .map((o) => o.replace(/([a-z])([A-Z])/g, "$1 $2").trim())
      : [];

    // format tags safely
    const tagNames = tags
      ? tags
          .split(",")
          .filter(Boolean)
          .map((t) => t.replace(/([a-z])([A-Z])/g, "$1 $2").trim())
      : [];

    // fetch related documents (parallel for speed)
    const [ownerDetail, teamDetail, projectDetail, tagDetail] =
      await Promise.all([
        ownerNames.length ? User.find({ name: { $in: ownerNames } }) : [],
        team ? Team.findOne({ name: team }) : null,
        project ? Project.findOne({ name: project }) : null,
        tagNames.length ? Tag.find({ name: { $in: tagNames } }) : [],
      ]);

    // apply filters
    if (ownerNames.length && ownerDetail?.length) {
      filter.owners = { $in: ownerDetail.map((o) => o._id) };
    }

    if (tagNames.length && tagDetail?.length) {
      filter.tags = { $in: tagDetail.map((t) => t._id) };
    }

    if (project && projectDetail?._id) filter.project = projectDetail._id;
    if (team && teamDetail?._id) filter.team = teamDetail._id;
    if (status)
      filter.status = status.replace(/([a-z])([A-Z])/g, "$1 $2").trim();

    // fetch tasks
    let tasks = await Task.find(filter)
      .populate("owners", "name")
      .populate("team", "name")
      .populate("tags", "name")
      .populate("project", "name");

    // ---------------------------
    // 🔥 SORTING LOGIC STARTS HERE
    // ---------------------------

    // Priority sorting
    if (prioritySort) {
      const order = { Low: 1, Medium: 2, High: 3 };

      if (prioritySort === "Low-High") {
        tasks.sort(
          (a, b) => (order[a.priority] || 0) - (order[b.priority] || 0)
        );
      }

      if (prioritySort === "High-Low") {
        tasks.sort(
          (a, b) => (order[b.priority] || 0) - (order[a.priority] || 0)
        );
      }
    }

    // Date sorting (createdAt)
    if (dateSort) {
      if (dateSort === "Newest-Oldest") {
        tasks.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
      }

      if (dateSort === "Oldest-Newest") {
        tasks.sort(
          (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        );
      }
    }

    // ---------------------------
    // 🔥 SORTING LOGIC ENDS HERE
    // ---------------------------

    return res.status(200).json(tasks);
  } catch (error) {
    console.log("TASK FETCH ERROR:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong fetching tasks" });
  }
});

//update task by id
app.put("/tasks/:id", async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json({ message: "Task updated successfully", updatedTask });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to update task." });
  }
});

// delete task by id
app.delete("/tasks/:id", async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Task deleted successfully", deletedTask });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to delete task." });
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
    console.log(error);
    res.status(500).json({ message: "Team creation failed", error });
  }
});

//add new team member
app.post("/team/:team_id/member", async (req, res) => {
  const { member } = req.body;
  try {
    const team = await Team.findById(req.params.team_id);
    team.members.push(member);
    await team.save();
    const populatedTeam = await Team.findById(req.params.team_id).populate(
      "members"
    );
    res.status(201).json({
      message: "New team member added successfully",
      team: populatedTeam,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "failed to add member" });
  }
});

//get team
app.get("/teams", async (req, res) => {
  try {
    const teams = await Team.find().populate("members");
    res.send(teams);
  } catch (error) {
    console.log(error);
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
    console.log(error);
    res.status(500).json({ message: "project creation failed" });
  }
});

//get project
app.get("/projects", async (req, res) => {
  const { name } = req.query;
  const filter = {};

  if (name) {
    filter.name = name;
  }

  try {
    const projects = await Project.find(filter);
    res.send(projects);
  } catch (error) {
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
