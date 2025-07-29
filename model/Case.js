const crypto = require("crypto");
const db = require("../database/connect");

const caseNotFound = "case not found";

class Case {
  constructor({id, created_at, created_by, title, description, invite_token}){
    this.id = id;
    this.created_at = new Date(created_at);
    this.created_by = created_by;
    this.title = title;
    this.description = description;
    this.invite_token = invite_token;
  }

  static async create({title, description, user_id}){
    let invite_token;
    while(true){
      // 64 long random hex, collision will literally never happen but better safe than sorry.
      invite_token = crypto.randomBytes(32).toString("hex");
      const exists = await Case.getByInviteToken(invite_token)
        .catch((e)=>e.message === caseNotFound ? null : e);
      if(exists instanceof Error) throw exists;
      if(exists === null) break;
    }

    const res = await db.query(
      "INSERT INTO cases(created_at, created_by, title, description, invite_token) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [new Date(), user_id, title, description, invite_token]
    );
    if(res.rows.length === 0) throw new Error("case creation failure");

    return new Case(res.rows[0]);
  }

  static async getById(cid) {
    const res = await db.query("SELECT * FROM cases WHERE id = $1", [cid]);
    if(res.rows.length === 0) throw new Error(caseNotFound)
    return new Case(res.rows[0]);
  }

  static async getByInviteToken(token) {
    const res = await db.query("SELECT * FROM cases WHERE invite_token = $1", [token]);
    if(res.rows.length === 0) throw new Error(caseNotFound)
    return new Case(res.rows[0]);
  }

  static async getByCreator(uid){
    return db.query("SELECT * FROM cases WHERE created_by = $1 ORDER BY id", [uid])
      .then(r=>r.rows.map(c => new Case(c)));
  }

  async destroy(){
    return db.query("DELETE FROM cases WHERE id = $1", [this.id]);
  }

  async modify({title, description}){
    const res = await db.query("UPDATE cases SET title = $1, description = $2 WHERE id = $3 RETURNING *", [
      title, description, this.id
    ]);
    if(res.rows.length === 0) throw new Error("case update failed");
    return new Case(res.rows[0]);
  }
}

module.exports = Case
