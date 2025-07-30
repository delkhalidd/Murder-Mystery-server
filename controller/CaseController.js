const Case = require("../model/Case");
const Question = require("../model/Question");
const TeacherInput = require("../model/TeacherInput");
const Brief = require("../model/Brief");
const Answer = require("../model/Answer");
const {transformQuestionsAndGetBriefs} = require("../openai");
const {AccountTypeTeacher, AccountTypeStudent} = require("../database/const");
const Invite = require("../model/Invite");
const transformationStatusMap = new Map();
const { AccountTypeStudent } = require("../database/const");


const get = async (req, res) => {
  const questions = await Question.getByCase(req.case.id);
  const withInputs = await mapInputsOntoQuestions(req, questions);
  const briefs = await Brief.getByCase(req.case.id);
  let json = {
    ...req.case,
    questions: withInputs.map(q=>{
      if(req.user.account_type === AccountTypeStudent){
        delete q.answer;
        delete q.input_id;
        delete q.original;
      }
      delete q.case_id;
      return q;
    }),
    briefs,
  };

  if(req.user.account_type === AccountTypeStudent){
    json.started_at = req.invite.started_at;
  }
  return res.json(json);
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

  if(req.user.account_type === AccountTypeStudent){
    return res.json(questions.map(q=>{
      delete q.answer;
      return q;
    }));
  }

  return res.json(await mapInputsOntoQuestions(req, questions)); // send original input alongside questions
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

const canEditCase = (req, res) => {
  if(req.case.created_by !== req.user.id) {
    res.status(403).json({
      message: "Forbidden"
    });
    return false;
  }
  return true;
}

const getTransformationStatus = async (req, res) => {
  if(!canEditCase(req, res)) return;
  const status = await _getTransformationStatus(req);
  return res.status(status.status === "ERRORED" ? 500 : 200).json(status);
}

const edit = async (req, res) => {
  if(!canEditCase(req, res)) return;
  try{
    let _case = await req.case.modify(req.body);
    return res.json(_case);
  }catch(e){
    return res.status(400).json({
      message: e.message
    });
  }
}

const deleteCase = async (req, res) => {
  if(!canEditCase(req, res)) return;
  try{
    await Question.destroyByCase(req.case.id);
    await TeacherInput.destroyByCase(req.case.id);
    await Brief.destroyByCase(req.case.id);
    await Invite.destroyByCase(req.case.id);
    await req.case.destroy();
    return res.status(204).end();
  }catch(e){
    return res.status(500).json({
      message: e.message
    });
  }
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

const createAnswers = async (req, res) => {
  const questionId = req.params.qid
  const caseId = req.params.id

  // check student is logged in
  if (req.user.account_type !== AccountTypeStudent) {
    return res.status(403).json({ message: "Only students can submit answers"});
  }

  if (!req.body || !req.body.answer) {
    return res.status(400).json({
      message: "Missing answwer in request body"
    });
  }

  try {
    // retrieve question
    const question = await Question.getById(questionId);

    //Ensure question is part of this case
    if (question.case_id != caseId) {
      return res.status(403).json({
        message: "Question does not belong to this case"
      });
    }

    // Check if question has already been answered by user
    const existingAnswer = await Answer.getByUserAndQuestion(req.user.id, questionId);
    if (existingAnswer) {
      return res.status(409).json({
        message: "You have already answered this question"
      });
    }

    // Check that questions are being answered in order
    const allCaseQuestions = await Question.getByCase(req.case.id);
    const currentIndex = allCaseQuestions.findIndex(q => q.id === question.id)

    if (currentIndex > 0 ) {   // if this isn't the first question
      const previousQuestion = allCaseQuestions[currentIndex - 1];
      const prevAnswer = await Answer.getByUserAndQuestion(req.user.id, previousQuestion.id);

      if(!prevAnswer) {       // if previous answer doesnt exist
        return res.status(403).json({
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
    console.log(err);
    return res.status(500).json({
      message: "Failed to create answer"
    });
  }
};


const resolveMultiStatus = (req, res, results) => {
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
      question = await question.modify({
        body: q.body || question.body,
        answer: q.answer || question.answer
      });
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

  return resolveMultiStatus(req, res, results);
}

const modifyBriefs = async (req, res) => {
  if(!canEditCase(req, res)) return;
  if(!Array.isArray(req.body) || req.body.length === 0) return res.status(400).json({
    message: "body must be array of modified briefs"
  });

  const briefs = await Brief.getByCase(req.case.id).then(r=>r.reduce((prev, cur) => {
    prev[cur.id] = cur;
    return prev;
  }, {})); // indexed by id
  const results = await Promise.all(req.body.map(async b => {
    try{
      let brief = briefs[b.id];
      if(!brief) return {
        status: 404,
        message: "brief not found"
      }
      brief = await brief.modify({
        topic: b.topic || brief.topic,
        body: b.body || brief.body
      });
      return {
        status: 200,
        ...brief,
      }
    }catch(e){
      return {
        status: 400,
        message: e.message
      }
    }
  }));

  return resolveMultiStatus(req, res, results);
}

const getByInvite = async (req, res) => {
  return res.json(req.case);
}

const acceptInvite = async (req, res) => {
  if(req.user.account_type !== AccountTypeStudent) return res.status(403).send({
    message: "invites can only be accepted by students"
  });
  if(await Invite.getByCaseUser(req.case.id, req.user.id).catch(e=>null) !== null) return res.status(409).json({
    message: "Invite already accepted"
  });
  const invite = await Invite.create({
    case_id: req.case.id,
    user_id: req.user.id
  });

  const questions = await Question.getByCase(req.case.id);
  const briefs = await Brief.getByCase(req.case.id);
  return res.json({
    ...req.case,
    questions: questions.map(q=>{
      delete q.input_id;
      return q;
    }),
    briefs
  });
}

const startCase = async (req, res) => {
  if(req.user.account_type !== AccountTypeStudent)  return res.status(403).json({
    message: "cases can only be started by students"
  });
  if(req.invite.started_at !== null) return res.status(409).json({
    message: "case already started!"
  });

  req.invite = await req.invite.start();
  const questions = await Question.getByCase(req.case.id);
  const briefs = await Brief.getByCase(req.case.id);
  return res.json({
    ...req.case,
    questions: questions.map(q=>{
      delete q.input_id;
      delete q.answer;
      return q;
    }),
    briefs,
    started_at: req.invite.started_at
  });
}

const getMine = async (req, res) => {
  if(req.user.account_type === AccountTypeStudent){
    // TODO: get cases by accepted invites
  }else{
    return res.json(await Case.getByCreator(req.user.id)
      .then(cases=>Promise.all(cases.map(async c => {
        const questions = await Question.getByCase(c.id);
        const briefs = await Brief.getByCase(c.id);

        return {
          ...c,
          questions,
          briefs
        }
      })))
    );
  }
}

module.exports = {
  get, create, edit, delete: deleteCase,
  getQuestions, getTransformationStatus, createQuestions,
  modifyQuestions, modifyBriefs,
  getByInvite, acceptInvite, startCase,
  getMine, createAnswers
}
