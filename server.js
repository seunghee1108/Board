const express = require("express");
const app = express();

const PORT = 3000;

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs')

const { MongoClient } = require('mongodb')

let db
const url = 'mongodb+srv://admin:sh123@cluster0.lfkcymr.mongodb.net/?retryWrites=true&w=majority'
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('Board')
	app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
   });
}).catch((err)=>{
  console.log(err)
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + "/index.html")
})
