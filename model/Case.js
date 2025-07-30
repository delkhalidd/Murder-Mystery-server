const crypto = require("crypto");
const db = require("../database/connect");
const Invite = require("./Invite");
const Question = require("./Question");
const Answer = require("./Answer");

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
    return db.query("SELECT * FROM cases WHERE created_by = $1 ORDER BY id DESC", [uid])
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

  async analytics(){
    const invites = await Invite.getByCase(this.id);

    const started = invites.filter(i=>i.started_at !== null);
    const startedIdxByUid = started.reduce((prev, cur, i) => {
      prev[cur.user_id] = i;
      return prev;
    }, {})
    let questions = await Question.getByCase(this.id);
    const answersByQuestion = await Answer.getByCase(this.id).then(answers=>answers.reduce((prev, cur) => {
      if(prev[cur.question_id]) prev[cur.question_id].append(cur);
      else prev[cur.question_id] = [cur];

      return prev;
    }, {}));
    const ansIdxByUid = [];
    const correctByUid = {};

    questions = questions.map((q, i)=>{
      const answers = answersByQuestion[q.id] || [];
      const curAnsIdxByUid = {};
      const inputs = {};
      const inputCounts = {};
      let correct = 0;

      const timeTaken = answers.reduce((prev, cur, ai) => {
        curAnsIdxByUid[cur.user_id] = ai;
        let delta = 0;
        if(i === 0) delta = cur.created_at.getTime() - started[startedIdxByUid[cur.user_id]].started_at.getTime();
        else delta = cur.created_at.getTime() - answersByQuestion[questions[i-1].id][ansIdxByUid[i-1][cur.user_id]].created_at.getTime();
        prev.push(delta);

        const inputKey = cur.answer.toLowerCase();
        if(!inputs[inputKey]) inputs[inputKey] = cur.answer;
        inputCounts[inputKey] = (inputCounts[inputKey] || 0) + 1;
        if(cur.correct) correct++;
        correctByUid[cur.user_id] = (correctByUid[cur.user_id] || 0) + (correct ? 1 : 0);

        return prev;
      }, []);

      ansIdxByUid.push(curAnsIdxByUid);

      return {
        ...q,
        analytics: {
          time_taken: timeTaken,
          answers: Object.entries(inputs).reduce((prev, cur) => {
            prev[cur[1]] = inputCounts[cur[0]];
            return prev;
          }, {}),
          correct
        }
      }
    });

    const studentPerformance = new Array(questions.length+1).fill(0);
    for(let i = 0; i < questions.length+1; i++){
      for(const correct of Object.values(correctByUid)){
        if(correct === i) studentPerformance[i]++;
      }
    }

    return {
      questions,
      accepted_invites: invites.length,
      started_invites: started.length,
      performance: studentPerformance
    }
  }
}

module.exports = Case
