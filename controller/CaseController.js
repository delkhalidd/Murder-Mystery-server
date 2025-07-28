const Case = require("../model/Case");
const Question = require("../model/Question");
const TeacherInput = require("../model/TeacherInput");
const {transformQuestionsAndGetBriefs} = require("../openai");
const transformationStatusMap = new Map();

const get = (req, res) => {
  return res.json(req.case);
}

const create = async (req, res) => {
    // TODO: limit routes to teachers only

    const payload = {
      ...req.body,
      user_id: 1 // req.user.id
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
    .then(r=>r.reduce((cur, prev) => {
      cur[prev.id] = prev;
      return cur;
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
  // TODO: limit to teacher
  if(transformationStatusMap.has(req.case.id)) return transformationStatusMap.get(req.case.id);

  const questions = await Question.getByCase(req.case.id);
  if(questions.length === 0) return {
    status: "PENDING"
  };

  return {
    status: "COMPLETED",
    result: await mapInputsOntoQuestions(req, questions)
  };
}

const getTransformationStatus = async (req, res) => {
  const status = await _getTransformationStatus(req);
  return res.status(status.status === "ERRORED" ? 500 : 200).json(status);
}

const createQuestions = async (req, res) => {
  const status = await _getTransformationStatus(req);
  if (status.status === "PROCESSING") return res.status(409).json({
    message: "Already processing"
  });
  if(!Array.isArray(req.body)) return res.status(400).json({
    message: "Body must be array"
  });

  if(status.status === "COMPLETED"){
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
    transformationStatusMap.delete(req.case.id);
  }catch(e){
    status.status = "ERRORED";
    status.message = e.message;
    transformationStatusMap.set(req.case.id, status);
    console.error(e);
    await TeacherInput.destroyByCase(req.case.id);
  }
}

module.exports = {
  get, create,
  getQuestions, getTransformationStatus, createQuestions
}
