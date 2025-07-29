const {Router} = require("express");
const CaseController = require("../controller/CaseController");
const caseMiddleware = require("../middleware/case");
const authMiddleware = require("../middleware/auth");

const router = Router();

router.post("/", authMiddleware(true), CaseController.create);

router.get("/:id", authMiddleware(true), caseMiddleware, CaseController.get);

router.get("/:id/questions", authMiddleware(true), caseMiddleware, CaseController.getQuestions);
router.post("/:id/questions", authMiddleware(true), caseMiddleware, CaseController.createQuestions);
router.patch("/:id/questions", authMiddleware(true), caseMiddleware, CaseController.modifyQuestions);

router.get("/:id/questions/status", authMiddleware(true), caseMiddleware, CaseController.getTransformationStatus);

router.patch("/:id/briefs", authMiddleware(true), caseMiddleware, CaseController.modifyBriefs);

module.exports = router;
