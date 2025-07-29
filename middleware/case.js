const Case = require("../model/Case");
const {AccountTypeTeacher, AccountTypeStudent} = require("../database/const");
const Invite = require("../model/Invite");

const caseIdMiddleware = async (req, res, next) => {
  try{
    req.case = await Case.getById(req.params.id);

    if(req.user.account_type === AccountTypeStudent){
      req.invite = await Invite.getByCaseUser(req.case.id, req.user.id).catch(e=>null);
      if(req.invite !== null) return next();
    }else if(req.user.id === req.case.created_by){
      return next();
    }

    return res.status(403).json({
      message: "Forbidden"
    });
  }catch(e){
    return res.status(404).json({
      message: e.message
    });
  }
}

const caseInviteMiddleware = async (req, res, next) => {
  try{
    req.case = await Case.getByInviteToken(req.params.token);
    next();
  }catch(e){
    return res.status(404).json({
      message: e.message
    });
  }
}

module.exports = {
  caseIdMiddleware, caseInviteMiddleware
};
