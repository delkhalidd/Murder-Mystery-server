require("dotenv").config();
const {expect, it, describe, beforeAll, afterAll} = require("@jest/globals");
const Case = require("../model/Case");
const TeacherInput = require("../model/TeacherInput");
const Question = require("../model/Question");

describe("case database functions", ()=>{
  let c;
  beforeAll(async ()=>{
    c = await Case.create({
      user_id: 1,
      title: "the title",
      description: "the description"
    });
  });

  it("creates cases", async ()=>{
    expect(await Case.getById(c.id)).toEqual(c);
  });

  it("fetches via invite token", async () => {
    expect(await Case.getByInviteToken(c.invite_token)).toEqual(c);
  });

  it("gets destroyed", async () => {
    await c.destroy();
    expect(await Case.getById(c.id).catch(e=>"threw")).toBe("threw");
  });
});

describe("input database functions", ()=>{
  let t, c;
  beforeAll(async ()=>{
    c = await Case.create({
      user_id: 1,
      title: "the title",
      description: "the description"
    });
    t = await TeacherInput.create({
      case_id: c.id,
      body: "the body",
      answer: "the description"
    });
  });

  it("creates input", async ()=>{
    expect(await TeacherInput.getById(t.id)).toEqual(t);
  });

  it("exists within getByCase", async () => {
    expect(await TeacherInput.getByCase(t.case_id).then(ts=>ts.filter(_t => _t.id === t.id).length)).toBe(1);
  });

  it("prepares for transformation correctly", () => {
    const transformed = t.toTransform();
    expect(transformed.answer).toBeTruthy();
    expect(transformed.question).toBeTruthy();
  });

  it("destroys all by case", async () => {
    await TeacherInput.destroyByCase(t.case_id);
    expect(await TeacherInput.getByCase(t.case_id).then(ts=>ts.length)).toBe(0);
  });

  afterAll(async ()=>{
    await c.destroy();
  });
});

describe("question database functions", ()=>{
  let t, q, c;
  const createQuestion = () => Question.create({
    case_id: c.id,
    input_id: t.id,
    body: "the new body",
    answer: "the new description"
  });
  beforeAll(async ()=>{
    c = await Case.create({
      user_id: 1,
      title: "the title",
      description: "the description"
    });
    t = await TeacherInput.create({
      case_id: c.id,
      body: "the body",
      answer: "the description"
    });
    q = await createQuestion();
  });

  it("creates questions", async ()=>{
    expect(await Question.getById(q.id)).toEqual(q);
  });

  it("fetches by original input", async () => {
    expect(await Question.getByInput(t.id)).toEqual(q);
  });

  it("exists within getByCase", async () => {
    expect(await Question.getByCase(q.case_id).then(qs=>qs.filter(_q => _q.id === q.id).length)).toBe(1);
  });

  it("destroys all by case", async () => {
    await Question.destroyByCase(q.case_id);
    expect(await Question.getById(q.id).catch(e=>"threw")).toBe("threw");
  });

  it("destroys individually", async () => {
    q = await createQuestion();
    await q.destroy();
    expect(await Question.getByCase(q.case_id).then(qs=>qs.length)).toBe(0);
  });

  afterAll(async ()=>{
    await t.destroy();
    await c.destroy();
  });
});
