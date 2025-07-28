const OpenAI = require("openai");
const system = require("./system.js");
const {searchWikipedia} = require("./wikipedia");

const client = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY
});

/**
 * @typedef {Object} OriginalQuestion
 * @property {string} question
 * @property {string} answer
 */

/**
 * @typedef {Object} TransformedQuestion
 * @property {number} originalIndex the index of the original untransformed question
 * @property {string} question
 * @property {string} answer
 */

/**
 * @typedef {Object} Brief explains about the topic to the student
 * @property {string} topic
 * @property {string} body
 */

/**
 * transformQuestionsAndGetBriefs takes entered questions and answers and turns them into a murder mystery
 * ORDER MAY BE CHANGED TO IMPROVE STORY FLOW
 * @param questions {OriginalQuestion[]}
 * @returns {Promise<TransformedQuestion[]>, Brief[]}
 */
const transformQuestionsAndGetBriefs = async (questions) => {
  const input = [
    {
      role: "user",
      content: JSON.stringify(questions.map((q, i) => {
        return {
          ...q, i,
        }
      }))
    }
  ]
  while(true){
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions: system.msg,
      input,
      tools: [{
        type: "function",
        name: "search_wikipedia",
        description: "Search Wikipedia for the summary of a specific article",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The title of the article"
            },
          },
          required: [
            "title"
          ],
          additionalProperties: false
        }
      }, {
        ...system.schema.schema,
        type: "function",
        name: "submit_response",
        description: "Submit the briefs and questions."
      }],
      tool_choice: input.length === 1 ? "required" : {
        type: "function",
        name: "submit_response"
      }
    });

    // do wiki requests in parallel
    const toolResponses = await Promise.all(response.output.map(async (o, i)=>{
      if(o.type !== "function_call") return;
      const parsed = JSON.parse(o.arguments);
      switch(o.name){
        case "submit_response":
          return {
            type: "response",
            output: [parsed.questions.map((q)=>{
              return {
                question: q.question,
                answer: q.answer,
                originalIndex: q.original_index
              }
            }), parsed.brief.map((b)=>{
              return {
                topic: b.topic,
                body: b.content
              }
            })]
          };
        case "search_wikipedia":
          const article = await searchWikipedia(parsed.title);
          return {
            type: "function_call_output",
            call_id: o.call_id,
            output: article || "NO CONTENT",
            callIndex: i,
          }
      }
    }))
    for(const r of toolResponses){
      if(!r) continue;
      switch(r.type){
        case "function_call_output":
          input.push(response.output[r.callIndex]);
          delete r.callIndex;
          input.push(r);
          break;
        case "response":
          return r.output;
      }
    }
  }
}

module.exports = {
  transformQuestionsAndGetBriefs
}
