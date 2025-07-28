const {Router} = require("express");

const userController = require('../controller/UserController.js')

const userRouter = Router();    // changed from router to userRouter incase merge clashses

userRouter.post("/register", userController.register);
userRouter.post("/login", userController.login);

module.exports = userRouter;
