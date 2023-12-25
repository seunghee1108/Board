const express = require("express");
const app = express();
// const path = require("path"); 

const PORT = 3000;

app.use(express.static(__dirname + '/public'));
// app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs')

// req.body 쓰기 위해 필요
app.use(express.json())
app.use(express.urlencoded({extended:true}))
// app.use(cookieParser());

const { MongoClient } = require('mongodb')
const { ObjectId } = require('mongodb') 
// const objectId = new ObjectId('');


let db
const url = 'mongodb+srv://admin:sh123@cluster0.lfkcymr.mongodb.net/?retryWrites=true&w=majority'

new MongoClient(url).connect().then((client) => {
  console.log('DB연결성공')
  db = client.db('Board')
	app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
   });
}).catch((err) => {
  console.log(err)
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

// DB에 잘 저장되는지 test
app.get('/test', (req, res) => {
  // data : collection name 
  db.collection('post').insertOne({title : '테스트'})
  .then(result => {
    res.send('테스트 데이터 삽입 성공');
})
.catch(error => {
    res.status(500).send('테스트 데이터 삽입 실패');
});
})

app.get('/list', async (req, res) => {
  try {
    let 글목록 = await db.collection('post').find().toArray();
    res.render('list.ejs', { 글목록: 글목록 });
  } catch (error) {
    console.error(error);
    res.status(500).send('글 목록을 불러오는 중 오류가 발생했습니다.');
  }
});


app.get('/write', (req, res) => {
  res.render('write.ejs')
});

app.post('/newPost', async(req, res) => {
  console.log(req.body)
  
  try {
    if (req.body.title == '') {
      res.send('제목을 입력해주세요')
    } else {
      await db.collection('post').insertOne({ title : req.body.title, content : req.body.content})
      res.redirect('/list')
    }
  } catch(e) {
    console.log(e);
    res.status.send('서버 에러')
  }
});

app.get('/detail/:id', async(req, res) => {
  try {
    const result =  await db.collection('post').findOne({ _id : new ObjectId(req.params.id) })
    console.log(req.params)
    res.render('detail.ejs' ,{ result : result })

  } catch(e) {
    console.log(e);
    res.status(400).send('으에')
  }
})

// 글 수정 기능
app.get('/edit/:id', async(req, res) => {

  const postId = req.params.id;

  if (!ObjectId.isValid(postId)) {
    return res.status(404).send('Invalid post ID');
  }

  const result = await db.collection('post').findOne({ _id : new ObjectId(req.params.id) })
  console.log(result)
  res.render('edit.ejs', { result : result })

})

// 수정 버튼 누르고 수정할 내용 작성
app.post('/edit/', async(req, res) => {

  await db.collection('post').updateOne({ _id : new ObjectId(req.body.id)},
  { $set : { title : req.body.title , content : req.body.content }}
  )
    console.log(req.body)
    res.redirect('/list')
})

app.post('/abcd', async(req, res) => {

  console.log('안녕')
  

})