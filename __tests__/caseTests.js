require("dotenv").config();
const {expect, it, describe, beforeAll} = require("@jest/globals");
const Case = require("../model/Case");

describe("case creations", ()=>{
  let c;
  beforeAll(async ()=>{
    c = await Case.create({
      user_id: 1,
      title: "the title",
      description: "the description"
    });
  });

  it("exists", async ()=>{
    expect(await Case.getById(c.id)).toEqual(c.id);
  });
});
