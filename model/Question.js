const Case = require("./Case");
const db = require("../database/connect");
const TeacherInput = require("./TeacherInput");

class Question{
  constructor({id, input_id, body, answer, case_id}){
    this.id = id;
    this.case_id = case_id;
    this.input_id = input_id;
    this.body = body;
    this.answer = answer;
  }

  static async create({body, answer, case_id, input_id}){
    const res = await db.query("INSERT INTO questions(input_id, body, answer, case_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [input_id, body, answer, case_id]
    );
    if(res.rows.length === 0) throw new Error("couldn't create question");

    return new Question(res.rows[0]);
  }

  static async getById(qid) {
    const res = await db.query("SELECT * FROM questions WHERE id = $1", [qid]);
    if(res.rows.length === 0) throw new Error("question not found");
    return new Question(res.rows[0]);
  }

  static async getByCase(cid){
    return db.query("SELECT * FROM questions WHERE case_id = $1 ORDER BY id", [cid])
      .then(r=>r.rows.map(q=>new Question(q)));
  }

  static async getByInput(tid) {
    const res = await db.query("SELECT * FROM questions WHERE input_id = $1", [tid]);
    if(res.rows.length === 0) throw new Error("question not found");
    return new Question(res.rows[0]);
  }

  static async destroyByCase(cid){
    return db.query("DELETE FROM questions WHERE case_id = $1", [cid]);
  }

  async destroy(){
    return db.query("DELETE FROM questions WHERE id = $1", [this.id]);
  }

  async modify({body, answer}){
    const res = await db.query("UPDATE questions SET body = $1, answer = $2 WHERE id = $3 RETURNING *", [
      body, answer, this.id
    ]);
    if(res.rows.length === 0) throw new Error("question update failed");
    return new Question(res.rows[0]);
  }
}

module.exports = Question;
