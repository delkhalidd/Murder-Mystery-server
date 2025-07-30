require("dotenv").config();
const fs = require('fs');
const db = require('./connect');
const dummyQuestions = require("./dummyQuestions.json");
const User = require("../model/User");
const Case = require("../model/Case");
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
      return await User.create({
        firstname: `u${i}`,
        surnames: `fake`,
        username: `fake_user_${i}`,
        email: `fake_user_${i}@fake.com`,
        password: "test_user",
        account_type: 0
      });
    }));
    console.log("Created fake students");
    const fakeCase = await Case.create({
      title: "fire of london",
      description: "fake case for presentation",
      user_id: 1
    });
    const questions = [];
    for(const question of dummyQuestions){
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

    await Promise.all(students.map(async (s, si)=>{
      const i = await Invite.create({
        case_id: fakeCase.id,
        user_id: s.id
      });
      if(si > 10) return;
      await i.start();
      let now = Date.now();
      for(const question of questions){
        now += 5000 + Math.random() * 10000;
        const correct = Math.random() >= 0.5;
        const a = await Answer.create({
          case_id: fakeCase.id,
          question_id: question.id,
          user_id: s.id,
          correct, answer: correct ? question.answer : `Incorrect ${Math.floor(Math.random() * 2)}`
        });
        await db.query("UPDATE answers SET created_at = $1 WHERE id = $2", [new Date(now), a.id]);
      }
    }));
    console.log("Created fake answers");
    console.log("Finished!");
    process.exit(0);
  })
  .catch(error => console.log(error));
