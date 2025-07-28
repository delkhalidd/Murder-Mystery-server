const {Router} = require("express");
const Case = require("../model/Case");
const CaseController = require("../controller/CaseController");
const caseMiddleware = require("../middleware/case");

const router = Router();

// TODO: authenticate routes
// router.use();

router.post("/", CaseController.create);

router.get("/:id", caseMiddleware, CaseController.get);

router.get("/:id/questions", caseMiddleware, CaseController.getQuestions);
router.post("/:id/questions", caseMiddleware, CaseController.createQuestions);

router.get("/:id/questions/status", caseMiddleware, CaseController.getTransformationStatus);

module.exports = router;
