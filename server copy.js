const express = require("express");
const app = express();

const PORT = 3000;

const { MongoClient } = require('mongodb')
const { ObjectId } = require('mongodb') 

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs')

// req.body 쓰기 위해 필요
app.use(express.json())
app.use(express.urlencoded({extended:true}))

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

app.use(passport.initialize())
app.use(session({
  secret: '암호화에 쓸 비번',
  resave : false,
  saveUninitialized : false,
  cookie : { maxAge : 60 * 60 * 1000 }
}))

app.use(passport.session()) 

// iam 계정 액세스 키
// * IAM bucket 새로 만들어야 됨
// const { S3Client } = require('@aws-sdk/client-s3')
// const multer = require('multer')
// const multerS3 = require('multer-s3')
// const s3 = new S3Client({
//   region : 'ap-northeast-2',
//   credentials : {
//       accessKeyId : 'AKIAYLH2UFYEMEP4KGK3',
//       secretAccessKey : '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' // 작성한 액세스 키 삭제함, 환경변수로 작성해야 됨
//   }
// })

// s3 bucket
// const upload = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: 'aws-firstproject',
//     key: function (요청, file, cb) {
//       cb(null, Date.now().toString()) //업로드시 파일명 변경가능
//     }
//   })
// })


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

app.set('view engine', 'ejs'); // view engine을 ejs로 설정

app.get('/', (req, res) => {
  res.render('main'); // render 메서드를 사용하여 index.ejs를 렌더링
});

// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/index.html')
// })



app.get('/test', async (req, res) => {
  try {
    // 현재 시간을 생성하여 createdAt 필드에 저장
    const currentDate = new Date();
    await db.collection('post').insertOne({ title: '테스트', createdAt: currentDate });
    res.send('테스트 데이터 삽입 성공');
  } catch (error) {
    console.error(error);
    res.status(500).send('테스트 데이터 삽입 실패');
  }
});

// 글 작성 + 이미지 업로드 기능 추가
app.post('/newPost', async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      res.status(401).send('로그인이 필요합니다.');
    } else if (req.body.title === '') {
      res.send('제목을 입력해주세요');
    } else {
      // 현재 시간을 생성하여 createdAt 필드에 저장
      const currentDate = new Date();
      await db.collection('post').insertOne({ 
        title: req.body.title, 
        content: req.body.content, 
        user: new ObjectId(req.user._id),
        username: req.user.username,
        createdAt: currentDate  // 작성한 날짜를 저장
      });
      res.redirect('/list');
    }
  } catch (e) {
    console.error(e);
    res.status(500).send('서버 에러');
  }
});

// DB에 잘 저장되는지 test
// app.get('/test', (req, res) => {
//   // data : collection name 
//   db.collection('post').insertOne({title : '테스트'})
//   .then(result => {
//     res.send('테스트 데이터 삽입 성공');
// })
// .catch(error => {
//     res.status(500).send('테스트 데이터 삽입 실패');
// });
// })

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

// 글 작성 + 이미지 업로드 기능 추가
// 글과 함께 이미지를 서버로 보내면 서버는 s3에 이미지 저장
// app.post('/newPost',  async(req, res) => {
//   console.log(req.user)
  
//   // console.log(req.file.location)
//   try {
//     if (!req.user || !req.user._id) {
//       res.status(401).send('로그인이 필요합니다.');
//     } else if (req.body.title === '') {
//       res.send('제목을 입력해주세요');
//     } else {
//       await db.collection('post').insertOne({ 
//         title: req.body.title, 
//         content: req.body.content, 
//         user: new ObjectId(req.user._id),
//         username: req.user.username 
//       });
//       res.redirect('/list');
//     }
//   } catch (e) {
//     console.error(e);
//     res.status(500).send('서버 에러');
//   }
  

//   try {
//     if (req.body.title == '') {
//       res.send('제목을 입력해주세요')s
//     } else {
//       await db.collection('post').insertOne({ 
//         title : req.body.title, 
//         content : req.body.content, 
//         user : req.user._id,
//         username : req.user.username })
//       res.redirect('/list')
//     }
//   } catch(e) {
//     console.log(e);
//     res.status.send('서버 에러')
//   }
// });

app.get('/detail/:id', async (req, res) => {
  try {
    const postId = req.params.id;

    if (!ObjectId.isValid(postId)) {
      return res.status(404).send('Invalid post ID');
    }

    
    const result2 = await db.collection('comment').find({ parentId : new ObjectId(req.params.id) }).toArray();

    const result = await db.collection('post').findOne({ _id: new ObjectId(postId) });

    if (!result) {
      return res.status(404).send('Post not found');
    }

    res.render('detail.ejs', { result: result , result2 : result2});
  } catch (e) {
    console.error('Error in /detail/:id:', e);
    res.status(500).send('Internal Server Error');
  }
});


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


app.post('/edit/', async (req, res) => {
  try {
    const postId = req.body.id;

    if (!ObjectId.isValid(postId)) {
      return res.status(404).send('잘못된 글 ID입니다.');
    }

    if (req.user && req.user._id) {
      // req.user가 정의되어 있고, req.user._id가 존재할 때에만 실행
      await db.collection('post').updateOne(
        { _id: new ObjectId(postId), user: new ObjectId(req.user._id) },
        { $set: { title: req.body.title, content: req.body.content } }
      );
      console.log(req.body);
      res.redirect('/list');
    } else {
      res.status(401).send('로그인이 필요합니다.');
    }
  } catch (error) {
    console.error('/edit/에서 오류 발생:', error);
    res.status(500).send('서버 내부 오류');
  }
});


app.get('/delete/:id', async (req, res) => {
  try {
    await db.collection('post').deleteOne({ _id: new ObjectId(req.params.id) });
    res.redirect('/list');
  } catch (error) {
    console.error(error);
    res.status(500).send('글 삭제 중 오류가 발생했습니다.');
  }
});

// 글 목록 페이지 나누기 
// limit(5) 맨 위에서부터 글 5개 보이게 해주세요.
// skip(5) 위에서 5개 건너뛰고 5개만 가져오세요.
app.get('/list/:id', async(req, res) => {
  const result = await db.collection('post').find().skip((req.params.id - 1) * 5 ).limit(5).toArray()
  res.render('list.ejs', { 글목록 : result })
})

app.get('/list/next/:id', async (req, res) => {
  try {
    // 클라이언트에서 전달된 id 값이 ObjectId 형식인지 확인
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).send('Invalid ObjectId format');
    }

    const lastPostId = new ObjectId(req.params.id);

    // DB에서 해당 ID보다 큰 게시물을 올바르게 검색
    const result = await db.collection('post').find({ _id: { $gt: lastPostId } }).limit(5).toArray();

    // 클라이언트에게 올바른 데이터를 렌더링
    res.render('list.ejs', { 글목록: result });
  } catch (error) {
    console.error('Error in /list/next/:id:', error);
    res.status(500).send('Internal Server Error');
  }
});



// 제출한 id, pw가 db랑 일치하는지 검사 
passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
  let result = await db.collection('user').findOne({ username : 입력한아이디})
  if (!result) {
    return cb(null, false, { message: '아이디 DB에 없음' })
  }
  if (result.password == 입력한비번) {
    return cb(null, result)
  } else {
    return cb(null, false, { message: '비번불일치' });
  }
}))

passport.serializeUser((user, done) => {
  console.log(user)
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username })
  })
})

passport.deserializeUser(async (user, done) => {
  const result = await db.collection('user').findOne({ _id : new ObjectId(user.id) })
  delete result.password
  process.nextTick(() => {
    return done(null, result)
  })
})

// app.js (일부분)

app.use(passport.initialize());
app.use(passport.session());

// 사용자 인증 상태 확인 미들웨어
// function isAuthenticated(req, res, next) {
//     if (req.isAuthenticated()) {
//         return next(); // 인증된 사용자일 경우 다음 미들웨어로 이동
//     }
//     res.redirect('/login'); // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
// }

// // 메인 페이지 라우트
// app.get('/', isAuthenticated, (req, res) => {
//     res.render('main', { user: req.user }); // 사용자 정보를 템플릿에 전달
// });

// // 로그인 페이지 라우트
// app.get('/login', (req, res) => {
//   res.render('login', { isLoggedIn: req.isAuthenticated() });
// });

// app.get('/login', (req, res) => {
//   // 사용자 로그인 상태에 따라 isLoggedIn 변수 설정
//   res.render('login', { isLoggedIn: req.session.isLoggedIn });
// });

// app.post('/login', (req, res) => {
//   // 로그인 로직 수행 후 성공 시
//   req.session.isLoggedIn = true; // 세션에 로그인 상태 저장
//   res.redirect('/'); // 홈페이지로 리다이렉트 또는 다른 동작 수행
// });

// app.post('/logout', (req, res) => {
//   // 로그아웃 로직 수행 후
//   req.session.isLoggedIn = false; // 세션에서 로그인 상태 제거
//   res.redirect('/'); // 홈페이지로 리다이렉트 또는 다른 동작 수행
// });
// // 로그아웃 라우트
// app.get('/logout', (req, res) => {
//     req.logout(); // PassportJS의 logout 메서드를 호출하여 세션에서 사용자 정보를 제거
//     res.redirect('/login'); // 로그아웃 후 로그인 페이지로 리다이렉트
// });
// app.post('/login', (req, res) => {
//   // 로그인 로직을 여기에 작성합니다.
//   const { username, password } = req.body;

//   // 예시: 간단한 로그인 검증
//   if (username === 'user' && password === 'password') {
//       // 로그인 성공
//       // res.send('로그인 성공!');
//       res.redirect('/main');
//   } else {
//       // 로그인 실패
//       res.send('로그인 실패: 유저명 또는 비밀번호가 잘못되었습니다.');
//   }
// });

// app.get('/main', (req, res) => {
//   // 이 부분에 메인 페이지를 렌더링하거나 메인 페이지의 HTML을 보내는 로직을 작성합니다.
//   // 예시: 메인 페이지를 렌더링하는 경우
//   res.render('main'); // 'main'은 메인 페이지의 템플릿 이름입니다. 실제로 사용하는 템플릿 이름으로 변경해야 합니다.
// });


// app.use((req, res, next) => {
//   // Passport.js를 사용하여 현재 세션에서 사용자가 인증되었는지 확인
//   res.locals.isLoggedIn = req.isAuthenticated();
//   next(); // 다음 미들웨어로 제어를 넘김
// });
// app.get('/', (req, res) => {
//   res.render('main', { isLoggedIn: req.isAuthenticated() }); // isLoggedIn 변수를 템플릿에 전달
// });
// app.post('/login', (req, res) => {
//   // 로그인 로직을 처리한 후 세션에 사용자 정보를 저장합니다.
//   req.session.isLoggedIn = true;
//   // 로그인 후 메인 페이지로 리다이렉션합니다.
//   res.redirect('/main');
// });

// app.get('/logout', (req, res) => {
//   // 로그아웃 요청을 처리하고 세션에서 사용자 정보를 제거합니다.
//   req.session.isLoggedIn = false;
//   // 로그아웃 후 메인 페이지로 리다이렉션합니다.
//   res.redirect('/main');
// });

// app.get('/main', (req, res) => {
//   // 메인 페이지에 사용자의 로그인 상태를 전달합니다.
//   res.render('main', { isLoggedIn: req.session.isLoggedIn });
// });

// app.get('/login', async (req, res) => {
//   console.log(req.user)
//   res.render('login.ejs')
// })

// app.post('/login', async (req, res, next) => {
//   passport.authenticate('local', (error, user, info) => { 
//     if (error) return res.status(500).json(error);
//     if (!user) return res.status(401).json(info.message);

//     req.logIn(user, (err) => {
//       if (err) return next(err); 

//             res.render('main.ejs', { user: user });
//       // 로그인 성공 시 메인 페이지로 리디렉션
//       // res.redirect('/');
//     });
//   })(req, res, next);
// });


// app.post('/login', async (req, res, next) => {
//   passport.authenticate('local', (error, user, info) => { 
//     if (error) return res.status(500).json(error);
//     if (!user) return res.status(401).json(info.message);

//     req.logIn(user, (err) => {
//       if (err) return next(err); 

//       // 로그인 성공 시 메인 페이지로 리디렉션
//       res.redirect('/'); 
//     });
//   })(req, res, next);
// });

// app.get('/', (req, res) => {
//   // 메인 페이지 렌더링 시에 사용자 정보를 전달하지 않음
//   res.render('main'); 
// });


// app.post('/login', async (req, res, next) => {
//   passport.authenticate('local', (error, user, info) => { 
//     if (error) return res.status(500).json(error);
//     if (!user) return res.status(401).json(info.message);

//     req.logIn(user, (err) => {
//       if (err) return next(err); 

//       // 로그인 성공 시 사용자 정보를 템플릿으로 전달
//       res.render('main.ejs', { user: user });
//       res.render('login.ejs', { user: user });
//     });
//   })(req, res, next);
// });



// app.post('/login', async (req, res, next) => {
//   passport.authenticate('local', (error, user, info) => { 
//     if (error) return res.status(500).json(error);
//     if (!user) return res.status(401).json(info.message);

//     req.logIn(user, (err) => {
//       if (err) return next(err); 

//       // 로그인 성공시에는 원하는 작업을 수행하고 리다이렉트
//       console.log(`User ${user.username} logged in successfully.`);
//       return res.redirect('/');  // 메인페이지로 이동
//     });
//   })(req, res, next);
// });

// app.get('/logout', (req, res) => {
//   req.logout(); // PassportJS의 logout 메서드를 호출하여 세션에서 사용자 정보를 제거합니다.
//   res.redirect('/login'); // 로그아웃 후 로그인 페이지로 리다이렉트합니다.
// });

// // 가입 기능
// app.get('/join', (req, res) => {
//   res.render('join.ejs')
// })

// app.post('/join', async (req, res) => {
//   await db.collection('user').insertOne({ 
//     username : req.body.username,
//     password : req.body.password,
//     email : req.body.email
//   })
//   res.redirect('/')  // 메인페이지로 이동
// })

app.get('/write', (req, res) => {
  res.render('write.ejs')
});
app.get('/write', (req, res) => {
  res.render('write.ejs', { isLoggedIn: req.isAuthenticated() });
});

// 댓글 기능
app.post('/comment', async (req, res) => {
  await db.collection('comment').insertOne({ 
    content: req.body.content,
    writerId: new ObjectId(req.user._id),
    writer: req.user.username,
    parentId: new ObjectId(req.body.parentId) // 수정: parantId -> parentId
  });
  res.redirect('back');
});


// 로그아웃 기능 추가
// css 수정
