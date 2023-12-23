const express = require("express");
const app = express();

const PORT = 3000;

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs')

// req.body 쓰기 위해 필요
app.use(express.json())
app.use(express.urlencoded({extended:true}))
// app.use(cookieParser());

const { MongoClient } = require('mongodb')
const { ObjectId } = require('mongodb') 
// const session = require('express-session')
// const cookieParser = require('cookie-parser')
// const bcrypt = require('bcrypt')
// const path = require('path')

// app.use(cookieParser({
//   secret: 'test',
//   resave: false,
//   saveUninitialized: false,
// }))

// const user  = [
//     { id: 1, 
//       username: 'Bang',
//       email: 'sh@test.com',
//       password: '1234'
//     }
// ]

// app.get('/', (req, res_))
//   res.render('')

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
})

// app.post('/newPost', (req, res) => {
//   console.log(req.body);
// })

app.post('/newPost', async(req, res) => {
  await db.collection('post').insertOne({ title : req.body.title, content : req.body.content })
  res.redirect('/list')
})

// / 다음 아무 문자나 입력해도 실행이 됨
// app.get('/detail/:abcd', (req, res) => {
//   res.render('detail.ejs')
// })

app.get('/detail/:id', async(req, res) => {
  req.params
  let result = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) })
  console.log( req.params)
  res.render('detail.ejs', { result : result })
  // findOne() : document 1개만 찾고 싶을 때 사용 
});

// app.get('/edit/:id', async (req, res) => {
//   let result = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) });
//   console.log(result); // 확인을 위한 로그

//   res.render('edit.ejs', { result });
// });

// app.post('/edit/:id', async (req, res) => {
//   try {
//     await db.collection('post').updateOne({ _id: new ObjectId(req.params.id) }, {
//       $set: { title: req.body.title, content: req.body.content }
//     });
//     res.redirect('/list');
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('글 수정 중 오류가 발생했습니다.');
//   }
// });

app.get('/delete/:id', async (req, res) => {
  try {
    await db.collection('post').deleteOne({ _id: new ObjectId(req.params.id) });
    res.redirect('/list');
  } catch (error) {
    console.error(error);
    res.status(500).send('글 삭제 중 오류가 발생했습니다.');
  }
});

// edit 페이지 수정 버튼 계속 에러 발생
app.get('/edit/:id', async (req, res) => {
  const postId = req.params.id;

  try {
    const post = await db.collection('post').findOne({ _id: new ObjectId(postId) });
    if (!result) {
      res.status(404).send('포스터 찾을 수 없다');
      return;
    }

    res.render('edit.ejs', { result });
  } catch (error) {
    console.error(error);
    res.status(500).send('내부 서버 오류');
  }
});

app.post('/update/:id', async (req, res) => {
  const postId = req.params.id;
  const { title, content } = req.body;

  try {
    await db.collection('post').updateOne(
      { _id: new ObjectId(postId) },
      { $set: { title, content } }
    );

    res.redirect('/list');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

