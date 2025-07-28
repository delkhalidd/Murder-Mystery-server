require("dotenv").config();
const {expect, it, describe, beforeAll} = require("@jest/globals");
const {transformQuestions} = require("../openai");
const {questions} = require("./openaiConsts.json");

describe("question transformations", ()=>{
  let brief, transformed;
  beforeAll(async () => {
    [transformed, brief] = await transformQuestions(questions);
    let log = "";

    for(const b of brief){
      log+= `TOPIC   : ${b.topic}\n`;
      log+= `CONTENT : ${b.body}\n`;
    }
    log += "\n\n";
    for(let i = 0; i < transformed.length; i++){
      const t = transformed[i];
      const o = questions[t.originalIndex];
      log+= `ORIGINAL   : [IDX ${t.originalIndex}] ${o.question}: ${o.answer}\n`;
      log+= `TRANSFORMED: [IDX ${i}]${t.question}: ${t.answer}\n`;
    }

    console.debug(log);
  }, 3e5); // 30s timeout

  it("returns responses", ()=>{
    expect(transformed).toBeTruthy();
    expect(brief).toBeTruthy();
  });

  it("returns the correct number", () => {
    expect(transformed.length).toBe(questions.length);
  });

  it("returns the correct indexes", ()=>{
    const indicesDone = new Array(questions.length).fill(false);
    for(const t of transformed){
      indicesDone[t.originalIndex] = true;
    }
    expect(indicesDone).toEqual(new Array(questions.length).fill(true));
  });
});
