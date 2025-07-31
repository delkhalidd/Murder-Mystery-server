require("dotenv").config();
const fs = require('fs');
const db = require('./connect');
const dummy = require("./dummyData.json");
const User = require("../model/User");
const Case = require("../model/Case");
const Brief = require("../model/Brief");
const TeacherInput = require("../model/TeacherInput");
const Question = require("../model/Question");
const Answer = require("../model/Answer");
const Invite = require("../model/Invite");
const sql = fs.readFileSync('./database/database.sql').toString();

db.query(sql)
  .then(async data => {
    console.log("Set-up complete.");
    console.log("Creating fake data");
    const students = await Promise.all(new Array(15).fill(0).map(async (_, i)=>{
      const name = dummy.names[i];

      return await User.create({
        firstname: name.firstname,
        surnames: name.surnames,
        username: `${name.firstname}.${name.surnames}`,
        email: `${name.firstname}.${name.surnames}@fake.com`,
        password: "test_user",
        account_type: 0
      });
    }));
    console.log("Created fake students");
    const dummyCase = dummy.cases[0];
    const fakeCase = await Case.create({
      title: dummyCase.title,
      description: dummyCase.description,
      user_id: 1
    });
    const questions = [];
    await Promise.all(dummyCase.briefs.map(async b => {
      await Brief.create({
        body: b.body,
        topic: b.topic,
        case_id: fakeCase.id,
      });
    }));
    for(const question of dummyCase.questions){
      const input = await TeacherInput.create({
        body: question.original,
        answer: question.answer,
        case_id: fakeCase.id
      });
      questions.push(await Question.create({
        body: question.body,
        answer: question.answer,
        case_id: fakeCase.id, input_id: input.id
      }));
    }
    console.log("Created fake case");

    const questionDifficulty = new Array(questions.length).fill(0).map(()=>0.1 + Math.random() * 0.8);
    await Promise.all(students.map(async (s, si)=>{
      const i = await Invite.create({
        case_id: fakeCase.id,
        user_id: s.id
      });
      if(si > 10) return;
      await i.start();
      let now = Date.now();
      let qi = 0;
      for(const question of questions){
        now += 5000 + Math.random() * 10000;
        const correct = Math.random() >= questionDifficulty[qi];
        const a = await Answer.create({
          case_id: fakeCase.id,
          question_id: question.id,
          user_id: s.id,
          correct, answer: correct ? question.answer : ["I don't know", "Ducks"][Math.floor(Math.random() * 2)]
        });
        await db.query("UPDATE answers SET created_at = $1 WHERE id = $2", [new Date(now), a.id]);
        qi++;
      }
    }));
    console.log("Created fake answers");
    console.log("Finished!");
    process.exit(0);
  })
  .catch(error => console.log(error));
