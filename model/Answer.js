const db = require("../database/connect");

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

    static async create({case_id, question_id, user_id, correct, answer}){                 // Not sure we need correct, as this is user input
        const res = await db.query("INSERT INTO answers (case_id, question_id, user_id, correct, answer, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [case_id, question_id, user_id, correct, answer, new Date()]
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
        return res.rows.map(row => new Answer(row));
    }

    static async getByQuestion(qId) {
        const res = await db.query("SELECT * FROM answers WHERE question_id = $1", [qId]);
        return res.rows.map(row => new Answer(row));
    }

    static async getByUser(uId) {
        const res = await db.query("SELECT * FROM answers WHERE user_id = $1", [uId]);
        return res.rows.map(row => new Answer(row));
    }

    static async getByUserAndQuestion(uId, qId) {
        const res = await db.query("SELECT * FROM answers WHERE user_id = $1 AND question_id = $2", [uId, qId]);
        return res.rows.map(row => new Answer(row));
    }
}

module.exports = Answer;
