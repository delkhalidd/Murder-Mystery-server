const {Router} = require("express");
const CaseController = require("../controller/CaseController");
const {caseIdMiddleware, caseInviteMiddleware} = require("../middleware/case");
const authMiddleware = require("../middleware/auth");

const router = Router();

router.post("/", authMiddleware(true), CaseController.create);

router.get("/:id", authMiddleware(true), caseIdMiddleware, CaseController.get);
router.patch("/:id", authMiddleware(true), caseIdMiddleware, CaseController.edit);
router.delete("/:id", authMiddleware(true), caseIdMiddleware, CaseController.delete);

router.get("/:id/questions", authMiddleware(true), caseIdMiddleware, CaseController.getQuestions);
router.post("/:id/questions", authMiddleware(true), caseIdMiddleware, CaseController.createQuestions);
router.patch("/:id/questions", authMiddleware(true), caseIdMiddleware, CaseController.modifyQuestions);

router.get("/:id/questions/status", authMiddleware(true), caseIdMiddleware, CaseController.getTransformationStatus);

router.patch("/:id/briefs", authMiddleware(true), caseIdMiddleware, CaseController.modifyBriefs);

router.get("/invite/:token", authMiddleware(true), caseInviteMiddleware, CaseController.getByInvite);
router.post("/invite/:token", authMiddleware(true), caseInviteMiddleware, CaseController.acceptInvite);

router.patch("/:id/start", authMiddleware(true), caseIdMiddleware, CaseController.startCase);

module.exports = router;
