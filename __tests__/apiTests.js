require("dotenv").config();
const {beforeAll, describe, test, expect, afterAll} = require("@jest/globals");
const User = require("../model/User");
const request = require('supertest');
const app = require("../app");
const db = require("../database/connect");
const {questions} = require("./openaiConsts.json");

let teacherUser, tuJWT;
let studentUser, suJWT;
beforeAll(async () => {
  teacherUser = await User.getOneById(1);
  studentUser = await User.getOneById(2);
  tuJWT = await teacherUser.generateJwt();
  suJWT = await studentUser.generateJwt();
});

describe("user account routes",  () => {
  let newUser;
  beforeAll(async ()=>{
    newUser = await request(app)
      .post("/api/user/register")
      .send({
        username: "new_test_user",
        password: "password",
        firstname: "test",
        surnames: "test",
        email: "me@email.com",
        account_type: 0
      })
      .set("Content-Type", "application/json")
      .then(r=>r.body.user);
    expect(newUser.id).toBeDefined();
  });

  test("user registration", async () => {
    expect(newUser.id).toBeDefined();
  });

  test("user login", async () => {
    let response = await request(app)
      .post("/api/user/login")
      .send({
        username: "new_test_user",
        password: "password"
      })
      .set("Content-Type", "application/json")
      .then(r=>r.body);
    expect(response.token).toBeDefined();

    response = await request(app)
      .get("/api/user")
      .set("Authorization", response.token)
      .then(r=>r.body);
    expect(response.id).toBe(newUser.id);
  });

  afterAll(async ()=>{
    if(newUser.id) await db.query("DELETE FROM users WHERE id = $1", [newUser.id]);
  });
});

describe("case routes",  () => {
  let c;
  const createCaseBody = {
    title: "test1",
    description: "test2"
  }
  const createQuestionsBody = questions.map(q=>{
    return {
      body: q.question,
      answer: q.answer
    }
  });


  beforeAll(async ()=>{
    c = await request(app)
      .post("/api/case")
      .send(createCaseBody)
      .set("Content-Type", "application/json")
      .set("Authorization", tuJWT)
      .then(r=>r.body);

    expect(c.id).toBeDefined();
  });

  describe("case creation", () => {
    test("teacher can create case", async () => {
      expect(c.id).toBeDefined();
    });

    test("student can't create case", async () => {
      let response = await request(app)
        .post("/api/case")
        .send(createCaseBody)
        .set("Content-Type", "application/json")
        .set("Authorization", suJWT);

      expect(response.statusCode).toBe(403);
    });
  });

  describe("case access and invitations",  () => {
    test("teacher can access case", async () => {
      const response = await request(app)
        .get(`/api/case/${c.id}`)
        .set("Authorization", tuJWT);

      expect(response.statusCode).toBe(200);
    });

    test("uninvited student can't access case", async () => {
      const response = await request(app)
        .get(`/api/case/${c.id}`)
        .set("Authorization", suJWT);

      expect(response.statusCode).toBe(403);
    });

    test("student can get case via invite", async () => {
      const response = await request(app)
        .get(`/api/case/invite/${c.invite_token}`)
        .set("Authorization", suJWT);

      expect(response.statusCode).toBe(200);
    });

    test("student can accept invite", async () => {
      const response = await request(app)
        .post(`/api/case/invite/${c.invite_token}`)
        .set("Authorization", suJWT);

      expect(response.statusCode).toBe(200);
    });

    test("student can't accept invite twice", async () => {
      const response = await request(app)
        .post(`/api/case/invite/${c.invite_token}`)
        .set("Authorization", suJWT);

      expect(response.statusCode).toBe(409);
    });

    test("invited student can get case", async () => {
      const response = await request(app)
        .get(`/api/case/${c.id}`)
        .set("Authorization", suJWT);

      expect(response.statusCode).toBe(200);
    });

    test("invited student can start case", async () => {
      const response = await request(app)
        .patch(`/api/case/${c.id}/start`)
        .set("Authorization", suJWT);

      expect(response.statusCode).toBe(200);
    });

    test("invited student can't start case twice", async () => {
      const response = await request(app)
        .patch(`/api/case/${c.id}/start`)
        .set("Authorization", suJWT);

      expect(response.statusCode).toBe(409);
    });
  });

  let q;

  describe("question and brief generation", () => {
    test("teacher can begin generation task", async () => {
      const response = await request(app)
        .post(`/api/case/${c.id}/questions`)
        .send(createQuestionsBody)
        .set("Content-Type", "application/json")
        .set("Authorization", tuJWT);

      expect(response.statusCode).toBe(202);
    });

    test("teacher can't begin conflicting generation task", async () => {
      const response = await request(app)
        .post(`/api/case/${c.id}/questions`)
        .send(createQuestionsBody)
        .set("Content-Type", "application/json")
        .set("Authorization", tuJWT);

      expect(response.statusCode).toBe(409);
    });

    let taskResult;
    test("generation task resolves", async () => {
      let i;
      for (i = 0; i < 110; i++){
        await new Promise(r=>setTimeout(r, 300));
        taskResult = await request(app)
          .get(`/api/case/${c.id}/questions/status`)
          .set("Authorization", tuJWT)
          .then(r=>r.body);
        expect(taskResult.status).toMatch(/PROCESSING|COMPLETED/gm);
        if(taskResult.status === "COMPLETED") break;
      }

      expect(taskResult.status).toBe("COMPLETED");
    }, 30000);

    test("generated questions and briefs are valid", async () => {
      expect(taskResult.status).toBe("COMPLETED");
      expect(Array.isArray(taskResult.result.questions)).toBe(true);
      expect(Array.isArray(taskResult.result.briefs)).toBe(true);
      q = taskResult.result.questions;
    });

    test("generated questions are available", async () => {
      const response = await request(app)
        .get(`/api/case/${c.id}/questions`)
        .set("Authorization", tuJWT)
        .then(r=>r.body);

      expect(response.length).toBeGreaterThan(0);
    });

    test("generated questions are available, without answers for students", async () => {
      const response = await request(app)
        .get(`/api/case/${c.id}/questions`)
        .set("Authorization", suJWT)
        .then(r=>r.body);

      expect(response.length).toBeGreaterThan(0);
      for(const q of response){
        expect(q.answer).toBeUndefined();
      }
    });

    test("students can't see answers or original questions", async () => {
      const response = await request(app)
        .get(`/api/case/${c.id}`)
        .set("Authorization", suJWT)
        .then(r=>r.body);

      for(const q of response.questions){
        expect(q.answer).toBeUndefined();
        expect(q.original).toBeUndefined();
      }
    });

    test("teachers can see answers and original questions", async () => {
      const response = await request(app)
        .get(`/api/case/${c.id}`)
        .set("Authorization", tuJWT)
        .then(r=>r.body);

      for(const q of response.questions){
        expect(q.answer).toBeDefined();
        expect(q.original).toBeDefined();
      }
    });
  });

  describe("answering questions", () => {

    const createAnswerBody = {
      answer: "test1"
    }

    const createAnswerBody2 = {
      answer: 'test2'
    }

    test("student can submit answer to question", async () => {
      const response = await request(app)
        .post(`/api/case/${c.id}/questions/${q[0].id}`)
        .send(createAnswerBody)
        .set("Authorization", suJWT)
        .set("Content-Type", "application/json");

      expect(response.statusCode).toBe(201);
      expect(response.body.correct).toBeDefined();
      expect(response.body.answer).toBe(createAnswerBody.answer);
    });

    test("student cannot answer same question twice", async () => {
      
      const response = await request(app)
        .post(`/api/case/${c.id}/questions/${q[0].id}`)
        .send(createAnswerBody)
        .set("Authorization", suJWT)
        .set("Content-Type", "application/json");

        expect(response.statusCode).toBe(409);
    });

    test("student can't answer question unless logged in", async () => {
      const response = await request(app)
        .post(`/api/case/${c.id}/questions/${q[0].id}`)
        .send(createAnswerBody)
        .set("Content-Type", "application/json");

      expect(response.statusCode).toBe(401)
      expect(response.body.message).toBe("Unauthorized");
    })

    test("Student must submit an answer", async () => {
      const response = await request(app)
        .post(`/api/case/${c.id}/questions/${q[0].id}`)
        .send()
        .set("Authorization", suJWT)
        .set("Content-Type", "application/json");

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe("Missing answer in request body");
    });

    test("Student must answer questions in order", async () => {
      const response = await request(app)
        .post(`/api/case/${c.id}/questions/${q[1].id}`)
        .send(createAnswerBody2)
        .set("Authorization", suJWT)
        .set("Content-Type", "application/json");

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe("You must answer the previous question first")
    });
  });

  describe("case modification", () => {
    // TODO: modification tests
  })

  describe("case deletion",  ()=>{
    test("student can't delete case", async () => {
      let response = await request(app)
        .delete(`/api/case/${c.id}`)
        .set("Authorization", suJWT);

      expect(response.statusCode).toBe(403);
    });

    test("teacher can delete case", async () => {
      let response = await request(app)
        .delete(`/api/case/${c.id}`)
        .set("Authorization", tuJWT);

      expect(response.statusCode).toBe(204);
    });
  });
});
