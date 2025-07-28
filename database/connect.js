const { Pool } = require("pg");

if(!process.env.DB_URL) throw new Error("please define DB_URL environment variable");

const db = new Pool({
  connectionString: process.env.DB_URL
});

console.log("DB connection established.");

module.exports = db;
