import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import * as dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import Notes from "./models/note.js";
dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

const CONNECTION_URL = process.env.MONGODB_URL;
const PORT = process.env.PORT || 5000;

const USERS = [
  {
    name: "User 1",
    id: "user01",
  },

  {
    name: "User 2",
    id: "user02",
  },
  {
    name: "User 3",
    id: "user03",
  },
  {
    name: "User 4",
    id: "user04",
  },
];
const PRIORITIES = ["High", "Medium", "Low"];

app.post("/notes", async (req, res) => {
  let { selectedUsers, selectedPriorities, sort } = req.body;
  console.log("req.body", selectedUsers, selectedPriorities, sort);
  let notes;
  if (!selectedUsers || !selectedUsers.length) {
    selectedUsers = USERS.map((user) => user.id);
  } else {
    selectedUsers = selectedUsers.map((user) => {
      const findUser = USERS.find((el) => el.name === user);
      return findUser.id;
    });
  }
  if (!selectedPriorities || !selectedPriorities.length) {
    selectedPriorities = [...PRIORITIES];
  }
  let sortValue = {};
  if (sort && sort === "Alphabetical Order") {
    sortValue = {
      note: 1,
    };
  } else if (sort && sort === "Created At") {
    sortValue = {
      createdAt: "desc",
    };
  } else if (sort && sort === "Updated At") {
    sortValue = {
      updatedAt: "desc",
    };
  }

  notes = await Notes.find({
    $and: [
      { createdBy: { $in: selectedUsers } },
      { priority: { $in: selectedPriorities } },
    ],
  }).sort(sortValue);

  res.json({ data: { notes, users: USERS, priorities: PRIORITIES } });
});

app.post("/filters", async (req, res) => {
  let { selectedUsers, selectedPriorities, sort } = req.body;
  // req.body { selectedUsers: [], selectedPriorities: [], sort: '' }

  const notes = await Notes.find().sort("-updatedAt");
  let filteredNotes = [...notes];
  if (selectedUsers.length > 0) {
    selectedUsers = selectedUsers.map((user) => {
      const findUser = USERS.find((el) => el.name === user);

      return findUser.id;
    });

    filteredNotes = notes.filter((note) =>
      selectedUsers.includes(note.createdBy)
    );
    console.log("filteredNotes", filteredNotes);
  }
  if (selectedPriorities.length > 0) {
    filteredNotes = notes.filter((note) =>
      selectedPriorities.includes(note.priority)
    );
  }
  // ["Alphabetical Order", "Created At", "Updated At"]
  if (sort === "Alphabetical Order") {
    filteredNotes = filteredNotes.sort((a, b) => a.note.localeCompare(b.note));
  } else if (sort === "Created At") {
    filteredNotes = filteredNotes.sort(
      (a, b) =>
        new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf()
    );
  } else if (sort === "Updated At") {
    filteredNotes = filteredNotes.sort(
      (a, b) =>
        new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf()
    );
  }
  res.json({ data: filteredNotes });
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.join("app");

  socket.on("add_note", async (data) => {
    const newNote = new Notes(data);

    try {
      await newNote.save();
      const notes = await Notes.find().sort("-updatedAt");
      io.to("app").emit("list_note", notes);
    } catch (error) {
      console.log("error in add_note", error.message);
    }
  });

  socket.on("edit_note", async (data) => {
    console.log("data in edit", data);

    try {
      await Notes.findByIdAndUpdate(data._id, data);
      const notes = await Notes.find().sort("-updatedAt");
      io.to("app").emit("list_note", notes);
    } catch (error) {
      console.log("error in edit_note", error.message);
    }
  });

  socket.on("delete_note", async (data) => {
    console.log("data in delete", data);
    try {
      await Notes.findByIdAndRemove(data._id);
      const notes = await Notes.find().sort("-updatedAt");
      io.to("app").emit("list_note", notes);
    } catch (error) {
      console.log("error in delete_note", error.message);
    }
  });

  socket.on("disconnect", () => console.log("User disconnected", socket.id));
});

mongoose
  .connect(CONNECTION_URL)
  .then(() =>
    server.listen(process.env.PORT, () =>
      console.log(`Server is running on ${PORT}`)
    )
  )
  .catch((error) => console.log(`${error} did not connect`));
