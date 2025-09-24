const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });
const connectDB = require('./config/db');

const app = express();
connectDB();
app.use(cors());
app.use(express.json());

app.use('/api/students', require('./routes/students'));
app.use('/api/recommendations', require('./routes/recommendations'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));