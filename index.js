const app = require("./app");
const Case = require("./model/Case");
const port = process.env.PORT || 3000;

if(process.env.IS_DOCKER){
  (async ()=>{
    const c = await Case.getById(1).catch(()=>false);
    if(!c){
      console.log("Doing DB setup");
      require("./database/setup");
    }
  })();
}

app.listen(port, ()=>{
  console.log(`Listening on port ${port}`);
});
