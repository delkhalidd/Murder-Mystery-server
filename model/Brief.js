const Case = require("./Case");
const db = require("../database/connect");

class Brief{
  constructor({id, case_id, body, topic}){
    this.id = id;
    this.case_id = case_id;
    this.body = body;
    this.topic = topic;
  }

  static async create({body, topic, case_id}){
    const c = await Case.getById(case_id);
    const res = await db.query("INSERT INTO briefs(case_id, body, topic) VALUES ($1, $2, $3) RETURNING *",
      [c.id, body, topic]
    );
    if(res.rows.length === 0) throw new Error("couldn't create brief");

    return new Brief(res.rows[0]);
  }

  static async getById(tid) {
    const res = await db.query("SELECT * FROM briefs WHERE id = $1", [tid]);
    if(res.rows.length === 0) throw new Error("input not found");
    return new Brief(res.rows[0]);
  }

  static async getByCase(cid){
    return db.query("SELECT * FROM briefs WHERE case_id = $1 ORDER BY id", [cid])
      .then(r=>r.rows.map(t=>new Brief(t)));
  }

  static async destroyByCase(cid){
    return db.query("DELETE FROM briefs WHERE case_id = $1", [cid]);
  }

  async destroy(){
    return db.query("DELETE FROM briefs WHERE id = $1", [this.id]);
  }

  async modify({topic, body}){
    const res = await db.query("UPDATE briefs SET body = $1, topic = $2 WHERE id = $3 RETURNING *", [
      body, topic, this.id
    ]);
    if(res.rows.length === 0) throw new Error("brief update failed");
    return new Brief(res.rows[0]);
  }
}

module.exports = Brief;
