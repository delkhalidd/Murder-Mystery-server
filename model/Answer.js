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

    static async create({case_id, question_id, user_id, correct, answer, created_at}){
        const c = await Case.getById(case_id);
        const q = await Question.getById(question_id);
        const u = await User.getOneById(user_id);
        const res = await db.query("INSERT INTO answers(case_id, question_id, user_id, correct, answer, created_at VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [c.id, q.id, u.id, correct, answer, created_at]
        );
    
        if(res.rows.length === 0) throw new Error("couldn't create answer");

        return new Answer(res.rows[0]);
    }

}