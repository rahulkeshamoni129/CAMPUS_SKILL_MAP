const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: String,
  degree: String,
  cgpa: Number,
  skills: [String],
  interests: [String],
});

module.exports = mongoose.model('Student', StudentSchema);