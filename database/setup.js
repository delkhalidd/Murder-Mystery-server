require("dotenv").config();
const fs = require('fs');
const db = require('./connect');
const sql = fs.readFileSync('./database/database.sql').toString();

db.query(sql)
  .then(data => console.log("Set-up complete."))
  .catch(error => console.log(error));
