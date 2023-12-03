const express = require("express");
const app = express();

const PORT = 3000;

const { MongoClient } = require('mongodb')

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
 });