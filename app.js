require("dotenv").config();
const express = require("express");
const cors = require("cors");
const api = require("./router/api");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", api);

app.use((req, res) => {
  res.status(404).end();
});

const port = process.env.PORT || 3000;

app.listen(port, ()=>{
  console.log(`Listening on port ${port}`);
});
