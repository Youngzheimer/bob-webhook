import express from "express";
import axios from "axios";
import config = require("./config.json");

const searchURL = "https://open.neis.go.kr/hub/schoolInfo";
const bobURL = "https://open.neis.go.kr/hub/mealServiceDietInfo";

const app = express();

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/src/index.html");
});

app.get("/api/searchschool", async (req, res) => {
  const q = req.query.q;

  const school = await axios.get(searchURL, {
    params: {
      KEY: config.key,
      Type: "json",
      pIndex: 1,
      pSize: 100,
      SCHUL_NM: q,
    },
  });

  if (school.data.schoolInfo) {
    return res.send({
      status: 200,
      result: school.data.schoolInfo,
    });
  } else {
    return res.send({
      status: 404,
      result: "검색 결과가 없습니다.",
    });
  }
});

app.get("/api/addwebhook", async (req, res) => {
  const url = req.query.url;
  const schoolCode = req.query.school;
  const eduCode = req.query.edu;

  //   const bob = await axios.get(bobURL, {
  //     params: {
  //       KEY: config.key,
  //       Type: "json",
  //       ATPT_OFCDC_SC_CODE: eduCode,
  //       SD_SCHUL_CODE: schoolCode,
  //       MLSV_YMD: new Date()
  //         .toISOString()
  //         .slice(0, 10)
  //         .replace("-", "")
  //         .replace("-", ""),
  //     },
  //   });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
