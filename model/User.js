const e = require('express');
const db = require('../database/connect');

class User {

    constructor({ id, firstname, surnames, username, email, password, account_type }) {
        this.id = id;
        this.firstname = firstname;
        this.surnames = surnames;
        this.username = username;
        this.email = email;
        this.password = password;
        this.account_type = account_type;
    }

    static async getOneById(id) {
        const response = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        if (response.rows.length != 1) {
            throw new Error("Unable to locate user.");
        }
        return new User(response.rows[0]);
    }

    static async getOneByUsername(username) {
        const response = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        if (response.rows.length != 1) {
            throw new Error("Unable to locate user.");
        }
        return new User(response.rows[0]);
    }

    static async create(data) {
        const { firstname, surnames, username, email, password, account_type } = data;
        let response = await db.query("INSERT INTO users (firstname, surnames, username, email, password, account_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;", [firstname, surnames, username, email, password, account_type]);
        const newId = response.rows[0].id;
        const newUser = await User.getOneById(newId);
        return newUser;
    }
}

module.exports = User;