import express from "express";
import axios from "axios";
import sqlite3 from "sqlite3";
import corn from "node-cron";
import config = require("./config.json");

const searchURL = "https://open.neis.go.kr/hub/schoolInfo";
const bobURL = "https://open.neis.go.kr/hub/mealServiceDietInfo";

const app = express();

// sqlite init
const db = new sqlite3.Database("db.sqlite");
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS webhook (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, schoolCode TEXT, eduCode TEXT)"
  );
});

async function addToDB(url: string, schoolCode: string, eduCode: string) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO webhook (url, schoolCode, eduCode) VALUES (?, ?, ?)",
      [url, schoolCode, eduCode],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve("success");
        }
      }
    );
  });
}

async function getWebhook(url?: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (url) {
      db.all("SELECT * FROM webhook WHERE url = ?", [url], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    }

    db.all("SELECT * FROM webhook", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

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

app.get("/api/getbob", async (req, res) => {
  const schoolCode = req.query.school;
  const eduCode = req.query.edu;

  const bob = await axios.get(bobURL, {
    params: {
      KEY: config.key,
      Type: "json",
      ATPT_OFCDC_SC_CODE: eduCode,
      SD_SCHUL_CODE: schoolCode,
      MLSV_YMD: new Date()
        .toISOString()
        .slice(0, 10)
        .replace("-", "")
        .replace("-", ""),
      //   MLSV_YMD: "20240624",
    },
  });

  if (bob.data.mealServiceDietInfo) {
    return res.send({
      status: 200,
      result: bob.data.mealServiceDietInfo,
    });
  } else {
    return res.send({
      status: 404,
      result: "급식 정보가 없습니다.",
    });
  }
});

app.get("/api/addwebhook", async (req, res) => {
  const url = req.query.url;
  const schoolCode = req.query.school;
  const eduCode = req.query.edu;

  if (
    typeof url !== "string" ||
    url.length === 0 ||
    typeof eduCode !== "string" ||
    eduCode.length === 0 ||
    typeof schoolCode !== "string" ||
    schoolCode.length === 0
  ) {
    return res.send({
      status: 400,
      result: "wrong query",
    });
  }

  await addToDB(url, schoolCode, eduCode);

  return res.send({
    status: 200,
    result: "success",
  });

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

app.get("/api/deletewebhook", async (req, res) => {
  const url = req.query.url;

  if (typeof url !== "string" || url.length === 0) {
    return res.send({
      status: 400,
      result: "wrong query",
    });
  }

  const webhooks = await getWebhook(url);

  if (webhooks.length === 0) {
    return res.send({
      status: 404,
      result: "webhook not found",
    });
  }

  db.run("DELETE FROM webhook WHERE url = ?", [url], (err) => {
    if (err) {
      return res.send({
        status: 500,
        result: err,
      });
    }

    return res.send({
      status: 200,
      result: "success",
    });
  });
});

corn.schedule("0 9 * * *", async () => {
  const webhooks = await getWebhook();

  for (const webhook of webhooks) {
    const bob = await axios.get(bobURL, {
      params: {
        KEY: config.key,
        Type: "json",
        ATPT_OFCDC_SC_CODE: webhook.eduCode,
        SD_SCHUL_CODE: webhook.schoolCode,
        MLSV_YMD: new Date()
          .toISOString()
          .slice(0, 10)
          .replace("-", "")
          .replace("-", ""),
        // MLSV_YMD: "20240624",
      },
    });

    if (bob.data.mealServiceDietInfo) {
      const bobs = bob.data.mealServiceDietInfo[1].row.map((bob: any) => {
        return {
          name: bob.MMEAL_SC_NM,
          value: bob.DDISH_NM.replaceAll("<br/>", "\n"),
        };
      });

      axios.post(webhook.url, {
        content: "",
        tts: false,
        embeds: [
          {
            title: "오늘의 급식",
            fields: bobs,
            footer: {
              text: "bobAPI",
            },
            timestamp: new Date().toISOString(),
            color: 11197951,
          },
        ],
        components: [],
        actions: {},
      });
    } else {
      axios.post(webhook.url, {
        content: "",
        tts: false,
        embeds: [
          {
            title: "오늘의 급식",
            description: "급식 정보가 없습니다.",
            footer: {
              text: "bobAPI",
            },
            timestamp: new Date().toISOString(),
            color: 11197951,
          },
        ],
      });
    }
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
