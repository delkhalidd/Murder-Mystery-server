const {Router} = require("express");
const authMiddleware = require("../middleware/auth");
const path = require("node:path");
const fs = require("node:fs");
const {resolve} = require("path");

const buildDir = process.env.CLIENT_BUILD_DIR;
const router = Router();
module.exports = router;

if(!buildDir){
  console.warn("No build directory set (CLIENT_BUILD_DIR), views will not be processed");
  return;
}

router.use(authMiddleware(false));

router.get("/", (req, res, next) => {
  if(!req.user) return res.redirect("/login");
  return res.redirect([
    "/teacher-dashboard", "/student-dashboard",
  ][req.user.account_type]);
});

const pages = {
  "/login": "/login.html",
  "/register": "/register.html",
  "/case-analytics": "/case-analytics.html",
  "/create-case": "/create-case.html",
  "/game-playing": "/game-playing.html",
  "/invite": "/invite.html",
  "/student-homepage": "/student-homepage.html",
  "/teacher-dashboard": "/teacher-dashboard.html",
  "/unauthorized": "/unauthorised.html",
}

router.use((req, res, next) => {
  if(req.method === "GET" && pages[req.path]){
    return res.sendFile(path.join(buildDir, pages[req.path]))
  }

  const resolved = path.join(buildDir, req.path);
  const relative = path.relative(buildDir, resolved);
  if(relative.startsWith("..")) return res.status(403).end();

  if(fs.existsSync(resolved)) return res.sendFile(resolved);
  return res.status(404).end();
});
