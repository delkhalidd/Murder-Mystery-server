const Case = require("./Case");
const db = require("../database/connect");

class TeacherInput{
  constructor({id, case_id, body, answer}){
    this.id = id;
    this.case_id = case_id;
    this.body = body;
    this.answer = answer;
  }

  static async create({body, answer, case_id}){
    const res = await db.query("INSERT INTO teacher_input(case_id, body, answer) VALUES ($1, $2, $3) RETURNING *",
      [case_id, body, answer]
    );
    if(res.rows.length === 0) throw new Error("couldn't create input");

    return new TeacherInput(res.rows[0]);
  }

  static async getById(tid) {
    const res = await db.query("SELECT * FROM teacher_input WHERE id = $1", [tid]);
    if(res.rows.length === 0) throw new Error("input not found");
    return new TeacherInput(res.rows[0]);
  }

  static async getByCase(cid){
    return db.query("SELECT * FROM teacher_input WHERE case_id = $1", [cid])
      .then(r=>r.rows.map(t=>new TeacherInput(t)));
  }

  static async destroyByCase(cid){
    return db.query("DELETE FROM teacher_input WHERE case_id = $1", [cid]);
  }

  toTransform(){
    return {
      question: this.body,
      answer: this.answer,
    }
  }

  async destroy(){
    return db.query("DELETE FROM teacher_input WHERE id = $1", [this.id]);
  }
}

module.exports = TeacherInput
