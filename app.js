require("dotenv").config();
const express = require("express");
const cors = require("cors");
const api = require("./router/api");

const app = express();
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
  allowedHeaders: ['Authorization']
}));
app.use(express.json());

app.use("/api", api);

app.use((req, res) => {
  res.status(404).end();
});

module.exports = app;
