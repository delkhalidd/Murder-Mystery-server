const Case = require("../model/Case");
const Question = require("../model/Question");
const TeacherInput = require("../model/TeacherInput");
const Brief = require("../model/Brief");
const {transformQuestionsAndGetBriefs} = require("../openai");
const {AccountTypeTeacher} = require("../database/const");
const transformationStatusMap = new Map();

const get = (req, res) => {
  return res.json(req.case);
}

const create = async (req, res) => {
  if(req.user.account_type !== AccountTypeTeacher) return res.status(403).json({
    message: "Forbidden"
  });

  const payload = {
    ...req.body,
    user_id: req.user.id
  }
  try{
    const c = await Case.create(payload);
    return res.status(201).json(c);
  }catch(e){
    return res.status(400).json({
      message: e.message
    });
  }
}

const mapInputsOntoQuestions = async (req, questions) => {
  const inputs = await TeacherInput.getByCase(req.case.id) // inputs indexed by input ID
    .then(r=>r.reduce((prev, cur) => {
      prev[cur.id] = cur;
      return prev;
    }, {}));

  return questions.map(q=>{
    return {
      ...q,
      original: inputs[q.input_id].body
    }
  })
}

const getQuestions = async (req, res) => {
  const questions = await Question.getByCase(req.case.id);

  return res.send(await mapInputsOntoQuestions(req, questions)); // send original input alongside questions
}

const _getTransformationStatus = async (req) => {
  if(transformationStatusMap.has(req.case.id)) return transformationStatusMap.get(req.case.id);

  const questions = await Question.getByCase(req.case.id);
  if(questions.length === 0) return {
    status: "PENDING"
  };
  const briefs = await Brief.getByCase(req.case.id);

  return {
    status: "COMPLETED",
    result: {
      questions: await mapInputsOntoQuestions(req, questions),
      briefs
    }
  };
}

const getTransformationStatus = async (req, res) => {
  if(req.user.account_type !== AccountTypeTeacher
    || req.case.created_by !== req.user.id) return res.status(403).json({
    message: "Forbidden"
  });
  const status = await _getTransformationStatus(req);
  return res.status(status.status === "ERRORED" ? 500 : 200).json(status);
}

const canEditCase = (req, res) => {
  if(req.user.account_type !== AccountTypeTeacher
    || req.case.created_by !== req.user.id) {
    res.status(403).json({
      message: "Forbidden"
    });
    return false;
  }
  return true;
}

const createQuestions = async (req, res) => {
  if(!canEditCase(req, res)) return;
  const status = await _getTransformationStatus(req);
  if (status.status === "PROCESSING") return res.status(409).json({
    message: "Already processing"
  });
  if(!Array.isArray(req.body)) return res.status(400).json({
    message: "Body must be array"
  });

  if(status.status === "COMPLETED"){
    await Brief.destroyByCase(req.case.id);
    await Question.destroyByCase(req.case.id);
    await TeacherInput.destroyByCase(req.case.id);
    delete status.result;
  }

  const inputs = [];
  for(const input of req.body){
    try{
      if(!input.body || !input.answer) throw new Error("question must have body and answer");
      inputs.push(await TeacherInput.create({
        ...input,
        case_id: req.case.id
      }));
    }catch(e){
      res.status(400).json({
        status: "ERRORED",
        message: e.message
      });
      await TeacherInput.destroyByCase(req.case.id);
      return;
    }
  }

  status.status = "PROCESSING";
  transformationStatusMap.set(req.case.id, status);
  res.status(202).json(status);

  const aiBody = inputs.map(t=>t.toTransform());
  try{
    const [transformed, briefs] = await transformQuestionsAndGetBriefs(aiBody);
    for(const t of transformed){
      await Question.create({
        body: t.question,
        answer: t.answer,
        case_id: req.case.id,
        input_id: inputs[t.originalIndex].id
      });
    }
    for(const b of briefs){
      await Brief.create({
        case_id: req.case.id,
        body: b.body,
        topic: b.topic
      });
    }
    transformationStatusMap.delete(req.case.id);
  }catch(e){
    status.status = "ERRORED";
    status.message = e.message;
    transformationStatusMap.set(req.case.id, status);
    console.error(e);
    await Question.destroyByCase(req.case.id);
    await TeacherInput.destroyByCase(req.case.id);
    await Brief.destroyByCase(req.case.id);
  }
}

const modifyQuestions = async (req, res) => {
  if(!canEditCase(req, res)) return;
  if(!Array.isArray(req.body) || req.body.length === 0) return res.status(400).json({
    message: "body must be array of modified questions"
  });

  const questions = await Question.getByCase(req.case.id).then(r=>r.reduce((prev, cur) => {
    prev[cur.id] = cur;
    return prev;
  }, {})); // indexed by id
  const results = await Promise.all(req.body.map(async q => {
    try{
      let question = questions[q.id];
      if(!question) return {
        status: 404,
        message: "question not found"
      }
      question = await question.modify(q.body || question.body, q.answer || question.answer);
      return {
        status: 200,
        ...question,
      }
    }catch(e){
      return {
        status: 400,
        message: e.message
      }
    }
  }));

  let status = results[0].status;
  for(const res of results.slice(1)){
    if(res.status !== status){
      status = 207;
    }
  }
  if(status !== 207) return res.status(status).json(results.map(r=>{
    delete r.status;
    return r;
  }));
  return res.status(207).json(results);
}

const modifyBriefs = (req, res) => {
  if(!canEditCase(req, res)) return;

}

module.exports = {
  get, create,
  getQuestions, getTransformationStatus, createQuestions,
  modifyQuestions, modifyBriefs
}
