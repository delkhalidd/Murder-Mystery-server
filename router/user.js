const {Router} = require("express");

const userController = require('../controller/UserController.js')
const authMiddleware = require("../middleware/auth");

const userRouter = Router();    // changed from router to userRouter incase merge clashses

userRouter.post("/register", userController.register);
userRouter.post("/login", userController.login);
userRouter.get("/", authMiddleware(true), userController.me);

module.exports = userRouter;
