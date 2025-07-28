const Case = require("../model/Case");

const caseMiddleware = async (req, res, next) => {
  // TODO: check user either created or was invited to case

  try{
    req.case = await Case.getById(req.params.id);
    next();
  }catch(e){
    return res.status(404).json({
      message: e.message
    });
  }
}

module.exports = caseMiddleware;
