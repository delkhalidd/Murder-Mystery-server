require("dotenv").config();
const express = require("express");
const cors = require("cors");
const api = require("./router/api");
const views = require("./views");
const cookieParser = require('cookie-parser')

const app = express();

app.use(cors({
  origin: (o, callback)=>{
    return callback(null, o && (['http://localhost:3001', 'http://localhost:3000', ].includes(o) || o.endsWith("trycloudflare.com")))
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.use("/api", api);
app.use("/", views);

app.use((req, res) => {
  res.status(404).end();
});

module.exports = app;
