const Case = require("../model/Case");
const Question = require("../model/Question");
const TeacherInput = require("../model/TeacherInput");
const Brief = require("../model/Brief");
const Answer = require("../model/Answer");
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

const createQuestions = async (req, res) => {
  if(req.user.account_type !== AccountTypeTeacher
    || req.case.created_by !== req.user.id) return res.status(403).json({
    message: "Forbidden"
  });
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

const createAnswers = async (req, res) => {
  const questionId = req.params.qid
  const caseId = req.params.id

  if (!req.body || !req.body.answer) {
    return res.status(400).json({
      status: "ERRORED",
      message: "Missing answer in request body"
    });
  }

  try {
    // retrieve question
    const question = await Question.getById(questionId);

    //Ensure question is part of this case
    if (question.case_id != caseId) {
      return res.status(403).json({
        status: "ERRORED",
        message: "Question does not belong to this case"
      });
    }

    // Check if question has already been answered by user
    const existingAnswer = await Answer.getByUserAndQuestion(req.user.id, questionId);
    if (existingAnswer) {
      return res.status(409).json({
        status: "ERRORED",
        message: "You have already answered this question"
      });
    }

    // Check that questions are being answered in order
    const allCaseQuestions = await Question.getByCase(req.case.id);
    const sortedQuestions = allCaseQuestions.sort((a, b) => a.id = b.id); 
    const currentIndex = sortedQuestions.findIndex(q => q.id === question.id)

    if (currentIndex > 0 ) {   // if this isn't the first question
      const previousQuestion = sortedQuestions[currentIndex - 1];
      const prevAnswer = await Answer.getByUserAndQuestion(req.user.id, previousQuestion.id);

      if(!prevAnswer) {       // if previous answer doesnt exist
        return res.status(403).json({
          status: "ERRORED",
          message: "You must answer the previous question first"
        });
      }
    }

    // compare student answer to question answer
    const studentAnswer = req.body.answer.toLowerCase();
    const correctAnswer = question.answer.toLowerCase();
    const isCorrect = studentAnswer === correctAnswer;

    const newAnswer = await Answer.create({
      case_id: req.case.id,
      question_id: question.id,
      user_id: req.user.id,
      correct: isCorrect,
      answer: req.body.answer
    });

    return res.status(201).json(newAnswer);

  } catch (err) {
    return res.status(500).json({
      status: "ERRORED",
      message: "Failes to create answer"
    });
  }
};


module.exports = {
  get, create,
  getQuestions, getTransformationStatus, createQuestions, createAnswers
}
