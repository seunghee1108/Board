const express = require("express");
const app = express();

const PORT = 3000;

const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");

require("dotenv").config();

app.use(express.static(__dirname + "/public"));

app.set("view engine", "ejs");

// req.body 쓰기 위해 필요
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const LocalStrategy = require("passport-local");

app.use(passport.initialize());
app.use(
  session({
    secret: "1108",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
    store: MongoStore.create({
      mongoUrl:
        "mongodb+srv://admin:sh123@cluster0.lfkcymr.mongodb.net/?retryWrites=true&w=majority",
      dbName: "Board",
    }),
  })
);

app.use(passport.session());

// iam 계정 액세스 키
// * IAM bucket 새로 만들어야 됨
const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
  region : 'ap-northeast-2',
  credentials : {
      accessKeyId : process.env.S3_KEY,
      secretAccessKey : process.env.S3_SECRET
      // 작성한 액세스 키 삭제함, 환경변수로 작성해야 됨
  }
})

// s3 bucket
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'boardproject',
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()) //업로드시 파일명 변경가능
    }
  })
})



let db;
const url = process.env.DB_URL;

new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("Board");
    app.listen(process.env.PORT, () => {
      console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    });
  })
  .catch((err) => {
    console.log(err);
  });

app.set("view engine", "ejs"); // view engine을 ejs로 설정

app.get("/", (req, res) => {
  res.render("main"); // render 메서드를 사용하여 index.ejs를 렌더링
});

// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/index.html')
// })

// DB에 잘 저장되는지 test
app.get("/test", (req, res) => {
  // data : collection name
  db.collection("post")
    .insertOne({ title: "테스트" })
    .then((result) => {
      res.send("테스트 데이터 삽입 성공");
    })
    .catch((error) => {
      res.status(500).send( "테스트 데이터 삽입 실패");
    });
});

app.get("/list", async (req, res) => {
  try {
    let 글목록 = await db.collection("post").find().toArray();
    res.render("list.ejs", { 글목록: 글목록 });
  } catch (error) {
    console.error(error);
    res.status(500).send("글 목록을 불러오는 중 오류가 발생했습니다.");
  }
});

app.get("/write", (req, res) => {
  res.render("write.ejs");
});


// 글 작성 + 이미지 업로드 기능 추가
// 글과 함께 이미지를 서버로 보내면 서버는 s3에 이미지 저장
app.post("/newPost", upload.single('img'), async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).send('<script>alert("로그인이 필요합니다."); window.location.href = "/login";</script>');
    } else if (req.body.title === "") {
      return res.send("제목을 입력해주세요");
    } else {
      // 이미지가 있을 때와 없을 때를 나누어 처리합니다.
      const postData = {
        title: req.body.title,
        content: req.body.content,
        user: new ObjectId(req.user._id),
        username: req.user.username,
        createdAt: new Date() // 작성 시간 추가
      };

      // 이미지가 있을 경우에만 img 필드 추가
      if (req.file) {
        postData.img = req.file.location;
      }

      await db.collection("post").insertOne(postData);
      return res.redirect("/list");
    }
  } catch (e) {
    console.error(e);
    return res.status(500).send("서버 에러");
  }
});


app.get("/detail/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    if (!ObjectId.isValid(postId)) {
      return res.status(404).send("Invalid post ID");
    }

    const result2 = await db
      .collection("comment")
      .find({ parentId: new ObjectId(req.params.id) })
      .toArray();

    const result = await db
      .collection("post")
      .findOne({ _id: new ObjectId(postId) });

    if (!result) {
      return res.status(404).send("Post not found");
    }

    res.render("detail.ejs", { result: result, result2: result2 });
  } catch (e) {
    console.error("Error in /detail/:id:", e);
    res.status(500).send("Internal Server Error");
  }
});

// 글 수정 기능
app.get("/edit/:id", async (req, res) => {
  const postId = req.params.id;

  if (!ObjectId.isValid(postId)) {
    return res.status(404).send("Invalid post ID");
  }

  const result = await db
    .collection("post")
    .findOne({ _id: new ObjectId(req.params.id) });
  console.log(result);
  res.render("edit.ejs", { result: result });
});

app.post("/edit/", async (req, res) => {
  try {
    const postId = req.body.id;

    if (!ObjectId.isValid(postId)) {
      return res.status(404).send("잘못된 글 ID입니다.");
    }

    if (req.user && req.user._id) {
      // req.user가 정의되어 있고, req.user._id가 존재할 때에만 실행
      await db
        .collection("post")
        .updateOne(
          { _id: new ObjectId(postId), user: new ObjectId(req.user._id) },
          { $set: { title: req.body.title, content: req.body.content } }
        );
      console.log(req.body);
      res.redirect("/list");
    } else {
      res.status(401).send("로그인이 필요합니다.");
    }
  } catch (error) {
    console.error("/edit/에서 오류 발생:", error);
    res.status(500).send("서버 내부 오류");
  }
});

app.get("/delete/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    // 요청된 게시물 ID가 유효한지 확인합니다.
    if (!ObjectId.isValid(postId)) {
      return res.status(404).send("유효하지 않은 게시물 ID");
    }

    // 데이터베이스에서 해당 게시물을 찾습니다.
    const post = await db
      .collection("post")
      .findOne({ _id: new ObjectId(postId) });

    // 게시물을 찾지 못한 경우 404 오류를 반환합니다.
    if (!post) {
      return res.status(404).send("게시물을 찾을 수 없습니다.");
    }

    // 세션에 저장된 사용자 ID를 가져옵니다.
    const loggedInUserId = req.user._id;

    // 게시물의 작성자 ID를 가져옵니다.
    const postAuthorId = post.user;

    // 작성자와 현재 로그인한 사용자를 비교하여 권한을 확인합니다.
    if (loggedInUserId.toString() !== postAuthorId.toString()) {
      return res.status(403).send("글 삭제 권한이 없습니다.");
    }

    // 작성자와 로그인한 사용자가 동일한 경우에만 게시물을 삭제합니다.
    await db.collection("post").deleteOne({ _id: new ObjectId(postId) });
    res.redirect("/list");
  } catch (error) {
    console.error("글 삭제 중 오류:", error);
    res.status(500).send("글 삭제 중 오류가 발생했습니다.");
  }
});

// 글 목록 페이지 나누기
// limit(5) 맨 위에서부터 글 5개 보이게 해주세요.
// skip(5) 위에서 5개 건너뛰고 5개만 가져오세요.
app.get("/list/:id", async (req, res) => {
  const result = await db
    .collection("post")
    .find()
    .skip((req.params.id - 1) * 5)
    .limit(5)
    .toArray();
  res.render("list.ejs", { 글목록: result });
});

app.get("/list/next/:id", async (req, res) => {
  try {
    console.log("Received parameter value:", req.params.id);

    // 클라이언트에서 전달된 id 값이 ObjectId 형식인지 확인
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).send("Invalid ObjectId format");
    }

    const lastPostId = new ObjectId(req.params.id); // ObjectId 생성

    const result = await db
      .collection("post")
      .find({ _id: { $gt: lastPostId } })
      .limit(5)
      .toArray();
    res.render("list.ejs", { 글목록: result });
  } catch (error) {
    console.error("Error in /list/next/:id:", error);
    res.status(500).send("Internal Server Error");
  }
});

// 제출한 id, pw가 db랑 일치하는지 검사
passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db
      .collection("user")
      .findOne({ username: 입력한아이디 });
    if (!result) {
      return cb(null, false, { message: "아이디 DB에 없음" });
    }
    if (result.password == 입력한비번) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: "비번불일치" });
    }
  })
);

passport.serializeUser((user, done) => {
  console.log(user);
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username });
  });
});

passport.deserializeUser(async (user, done) => {
  const result = await db
    .collection("user")
    .findOne({ _id: new ObjectId(user.id) });
  delete result.password;
  process.nextTick(() => {
    return done(null, result);
  });
});
// 로그인 요청 처리
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

// 로그아웃 요청 처리
app.get("/logout", function (req, res) {
  req.logout(function () {
    res.redirect("/");
  });
});

app.get("/", function (req, res) {
  res.render("main", { isLoggedIn: req.isAuthenticated() });
});

// 로그인 기능
app.get("/login", async (req, res) => {
  console.log(req.user);
  res.render("login.ejs");
});

app.post("/login", async (req, res, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) return res.status(500).json(error);
    if (!user) return res.status(401).json(info.message);

    req.logIn(user, (err) => {
      if (err) return next(err);

      // 로그인 성공시에는 원하는 작업을 수행하고 리다이렉트
      console.log(`User ${user.username} logged in successfully.`);
      return res.redirect("/"); // 메인페이지로 이동
    });
  })(req, res, next);
});
app.get("/", (req, res) => {
  res.render("main", { isLoggedIn: req.isAuthenticated() });
});

app.get("/main", (req, res) => {
  res.render("main", { isLoggedIn: true });
});

// 가입 기능
app.get("/join", (req, res) => {
  res.render("join.ejs");
});

app.post("/join", async (req, res) => {
  await db.collection("user").insertOne({
    username: req.body.username,
    password: req.body.password,
    email: req.body.email,
  });
  res.redirect("/"); // 메인페이지로 이동
});

// 댓글 기능
app.post("/comment", async (req, res) => {
  await db.collection("comment").insertOne({
    content: req.body.content,
    writerId: new ObjectId(req.user.id),
    writer: req.user.username,
    parentId: new ObjectId(req.body.parentId),
  });
  res.redirect("back");
});

app.get("/chat/request", async (req, res) => {
  await db.collection("chatroom").insertOne({
    member: [req.user._id, req.query.writerId],
    date: new Date(),
  });
  res.render("chatlist.ejs");
});

app.get("/chat/list", async (req, res) => {});
