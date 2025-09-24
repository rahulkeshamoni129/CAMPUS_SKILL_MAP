const express = require('express');
const router = express.Router();
const { generateRecommendation } = require('../utils/llm');

router.post('/', async (req, res) => {
  const studentData = req.body;
  const recommendation = await generateRecommendation(studentData);
  res.json({ recommendation });
});

module.exports = router;