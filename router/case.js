const {Router} = require("express");
const CaseController = require("../controller/CaseController");
const caseMiddleware = require("../middleware/case");
const authMiddleware = require("../middleware/auth");

const router = Router();

router.post("/", authMiddleware(true), CaseController.create);

router.get("/:id", authMiddleware(true), caseMiddleware, CaseController.get);

router.get("/:id/questions", authMiddleware(true), caseMiddleware, CaseController.getQuestions);
router.post("/:id/questions", authMiddleware(true), caseMiddleware, CaseController.createQuestions);

router.get("/:id/questions/status", authMiddleware(true), caseMiddleware, CaseController.getTransformationStatus);

router.post("/:id/questions/:qid", authMiddleware(true), caseMiddleware, CaseController.createAnswers);

module.exports = router;
