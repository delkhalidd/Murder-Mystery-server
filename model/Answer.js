const db = require("../database/database.sql")
const Case = require("./Case");
const Question = require("./Question");
const User = require("./User"); 

class Answer {
    constructor({id, case_id, question_id, user_id, correct, answer, created_at}){
        this.id = id;
        this.case_id = case_id;
        this.question_id = question_id;
        this.user_id = user_id;
        this.correct = correct;
        this.answer = answer;
        this.created_at = created_at;
    }

    static async create({correct, answer}){                 // Not sure we need correct, as this is user input
        const res = await db.query("INSERT INTO answers (correct, answer) VALUES ($1, $2) RETURNING *",
            [correct, answer]
        );
    
        if(res.rows.length === 0) throw new Error("couldn't create answer");

        return new Answer(res.rows[0]);
    }

    static async getById(aId) {
        const res = await db.query("SELECT * FROM answers WHERE id = $1", [aId]);
        if(res.rows.length === 0) throw new Error("answer not found");
        return new Answer(res.rows[0]);
    }

    static async getByCase(cId) {
        const res = await db.query("SELECT * FROM answers WHERE case_id = $1", [cId]);
        if(res.rows.length === 0) throw new Error("no answers found for this case");
        return res.rows.map(row => new Answer(row));
    }

    static async getByQuestion(qId) {
        const res = await db.query("SELECT * FROM answers WHERE question_id = $1", [qId]);
        if(res.rows.length === 0) throw new Error("no answers found for this question");
        return res.rows.map(row => new Answer(row));
    }

    static async getByUser(uId) {
        const res = await db.query("SELECT * FROM answers WHERE user_id = $1", [uId]);
        if(res.rows.length === 0) throw new Error("no answers found for this user");
        return res.rows.map(row => new Answer(row));
    }
}

module.exports = Answer;