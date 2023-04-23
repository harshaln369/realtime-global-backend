import mongoose from "mongoose";

const noteSchema = mongoose.Schema({
  room: String,
  contributedBy: {
    type: Array,
  },
  note: String,
  createdBy: String,
  history: {
    type: Array,
  },
  priority: String,
  createdAt: {
    type: Date,
    default: new Date(),
  },
  updatedAt: {
    type: Date,
    default: new Date(),
  },
});

const Notes = mongoose.model("Note", noteSchema);

export default Notes;
