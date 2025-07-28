const {Router} = require("express");
const user = require("./user");
const cases = require("./case");

const router = Router();
router.use("/user", user);
router.use("/case", cases);

module.exports = router;
