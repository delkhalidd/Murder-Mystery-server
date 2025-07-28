const fetch = require("node-fetch");
const { parse } = require("node-html-parser");

const cache = new Map();

const searchWikipedia = async (title) => {
  const key = title.toLowerCase();
  if(cache.has(key)) return cache.get(cache);

  let response = await fetch(`https://en.wikipedia.org/w/index.php?search=${
    encodeURIComponent(title).replaceAll(/%20/g, "+")
  }&title=Special%3ASearch&profile=advanced&fulltext=1&ns0=1`)
    .then(r=>r.text());

  let root = parse(response);
  const results = root.querySelectorAll(".searchresults .mw-search-result").map(el=>{
    return {
      title: el.querySelector(".mw-search-result-heading").innerText.trim(),
      url: `https://en.wikipedia.org${el.querySelector("a").getAttribute("href")}`
    }
  }).filter((r)=>{
    return !r.title.toLowerCase().includes("disambiguation")
  });

  let summary = "";
  if(results.length > 0){
    response = await fetch(results[0].url).then(r=>r.text());
    root = parse(response);

    const content = root.querySelector("#mw-content-text>div");

    for(const child of content.children){
      if(child.rawTagName === "p") summary += child.innerText + "\n";
      else if(child.classList.contains("mw-heading")) break;
    }
  }

  // remove citations[1] like this [a][23]
  summary = (summary || "NO CONTENT").trim().replaceAll(/\[(\d+|\w)\]/gm, "");

  cache.set(key, summary);
  return summary;
}

module.exports = {
  searchWikipedia
};
