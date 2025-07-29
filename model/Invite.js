const db = require("../database/connect");

class Invite{
  constructor({id, created_at, case_id, user_id, started_at}){
    this.id = id;
    this.created_at = new Date(created_at);
    this.case_id = case_id;
    this.user_id = user_id;
    this.started_at = started_at ? new Date(started_at) : null;
  }

  static async create({
    case_id, user_id
  }){
    const res = await db.query("INSERT INTO accepted_invites(created_at, case_id, user_id) VALUES ($1, $2, $3) RETURNING *",
      [new Date(), case_id, user_id]
    );
    if(res.rows.length === 0) throw new Error("couldn't create accepted invite");
    return new Invite(res.rows[0]);
  }
  static async getByCaseUser(cid, uid){
    const res = await db.query("SELECT * FROM accepted_invites WHERE case_id = $1 AND user_id = $2", [cid, uid]);
    if(res.rows.length === 0) throw new Error("couldn't find invite");
    return new Invite(res.rows[0]);
  }

  static async destroyByCase(cid){
    return db.query("DELETE FROM accepted_invites WHERE case_id = $1", [cid]);
  }

  async start(){
    if(this.started_at !== null) throw new Error("invite already started");
    const res = await db.query("UPDATE accepted_invites SET started_at = $1 WHERE id = $2 RETURNING *",
      [new Date(), this.id]
    );
    if(res.rows.length === 0) throw new Error("couldn't mark invite as started");
    return new Invite(res.rows[0]);
  }
}

module.exports = Invite;
