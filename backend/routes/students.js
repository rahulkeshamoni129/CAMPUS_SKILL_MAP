const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

router.post('/add', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;