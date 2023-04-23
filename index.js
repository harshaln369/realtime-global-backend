import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import * as dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
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
let notes = [];

app.get("/notes", (_req, res) => {
  res.json({ data: { notes, users: USERS, priorities: PRIORITIES } });
});

app.post("/filters", (req, res) => {
  console.log("req.body", req.body);
  let { selectedUsers, selectedPriorities, sort } = req.body;
  // req.body { selectedUsers: [], selectedPriorities: [], sort: '' }

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

  socket.on("add_note", (data) => {
    notes.push(data);
    console.log("data in add_note", data);
    io.to("app").emit("list_note", notes);
  });

  socket.on("edit_note", (data) => {
    console.log("data in edit", data);
    const foundNoteIndex = notes.findIndex(
      (note) => note.createdAt === data.createdAt
    );

    notes[foundNoteIndex] = data;
    io.to("app").emit("list_note", notes);
  });

  socket.on("delete_note", (data) => {
    console.log("data in delete", data);
    notes = notes.filter((note) => note.createdAt !== data.id);

    io.to("app").emit("list_note", notes);
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
