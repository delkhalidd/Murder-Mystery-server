const jwt = require("jsonwebtoken");
const User = require("/model/User");

const authMiddleware = (authRequired) => {
  return async (req, res, next) => {
    const auth = req.headers["authorization"];
    if(!auth){
      if(!authRequired) return next();
      return res.status(401).send({
        message: "Unauthorized"
      });
    }

    try{
      const decoded = jwt.decode(auth, process.env.SECRET_TOKEN);
      req.user = await User.getOneById(decoded.id);
      return next();
    }catch(e){
      if(!authRequired) return next();
      return res.status(403).send({
        message: "Forbidden (invalid JWT)"
      });
    }
  }
}

module.exports = authMiddleware;
