const express = require('express'); //express 기본 라우팅
const app = express(); //express 변수에 저장
const port = 9070;  //백엔드 서버 포트번호 기본설정
const cors = require('cors'); //cors: 크로스 도메인 요청을 허용 = 교차출처공유 허용
const mysql = require('mysql'); //mysql변수 생성
const bcrypt = require('bcrypt'); //해시 암호화
const jwt = require('jsonwebtoken'); //인증 토큰
const SECRET_KEY = 'test1234'; // JWT 서명용 비밀키

//서로 다른 시스템간 정보공유를 임시로 허용함
app.use(cors());

//모든 요청(POST, PUT, PATCH)에 대해 공통적용
//클라이언트가 보낸 JSON 데이터를 해석하여 req.body로 사용할 수 있게 해주는 Express 미들웨어이다.
app.use(express.json());

//DB연결정보 생성
//const connection = mysql.createConnection({ //동시접속자수 많아지면 터짐
const connection = mysql.createPool({
  host:'localhost',
  user:'root',
  password:'1234',
  database:'kdt'
});

//DB연결
//MYSQL DB서버 접속 오류가 있다면 오류 메세지 띄우기
connection.connect((err)=>{
  if(err){
    console.log('MYSQL 연결 실패 :', err);
    return;
  }
  console.log('MYSQL연결 성공');
});

//백엔드 서버 실행
app.listen(port, ()=>{
  console.log(`백엔드 서버 정상 동작중.... http://localhost:${port}`);
});

//브라우저에서 url주소 작성하여 테스트하기
//http://localhost:9070/

//주소줄에 localhost:9070/ 라고 적으면 json데이터 출력테스트됨
// app.get('/', (req, res)=>{
//   res.json('백엔드 서버 정상 동작중....');
// });

//서버 테스트2
//데이터 조회(GET) ginipet_users 테이블 
app.get('/ginipet', (req, res)=>{
  connection.query('SELECT * FROM ginipet_users', (err, results)=>{
    if(err){
      console.log('쿼리 오류 : ', err);
      res.status(500).json({err:'DB 쿼리 오류'});
      return;
    }
    res.json(results);
  });
});

//아이디 중복확인 조회
app.post('/check-username', (req, res)=>{
  const {username} = req.body;

  const sql = 'SELECT * FROM ginipet_users WHERE username=?';
  connection.query(sql, [username],(err, result)=>{
    if(err) return res.status(500).send(err);
    res.json({exists:result.length>0});
  });
});

//데이터 입력(POST, 회원가입)
//회원가입시 사용자가 입력한 데이터를 가져와서 요청된 정보를 처리하여 응답을 해준다.
app.post('/register',  async(req, res)=>{
  //프론트엔드에서 요청한 경로로 body영역의 값을 받아 저장
  const {username, password, email, tel} = req.body;

  try{ //성공시(값이 있는 경우)
    
    //1. 패스워드 암호화
    const hash = await bcrypt.hash(password, 10);
    
    //2. db에 자료 입력
    const sql = `
      INSERT INTO ginipet_users (username, password, email, tel) VALUES (?, ?, ?, ?)
    `;

    //입력이 끝나면 메세지 띄우기
    connection.query(sql, [username, hash, email, tel], err=>{
      if(err) return res.status(500).send(err);
      res.json({message:'회원가입 성공'});
    });

    //실패시(값이 없는 경우)
  }catch(err){ 
    res.status(500).send(err); //에러메세지 띄우기
  }
});

//로그인폼에서 전달받은 username, password값을 조회하여 로그인처리
app.post('/login', (req, res)=>{
  //프론트엔드에서 body태그에 정보를 넘겨받아 값을 저장
  const {username, password} = req.body;

  const sql = 'SELECT * FROM ginipet_users WHERE username=?';
  //사용자 아이디를 조회하여 가입한 아이디가 없다면 메세지 띄우기
  connection.query(sql, [username], async(err, result)=>{
    // DB 오류와 로그인 실패를 같은 메시지로 처리
    // if(err||result.length==0){
    //   return res.status(401).json({
    //     error:'아이디 또는 비밀번호가 틀립니다.'
    //   });
    // }
    //  아래처럼 수정하기
    if(err){
      return res.status(500).json({error:'DB 오류'});
    }

    if(result.length === 0){
      return res.status(401).json({error:'아이디 또는 비밀번호가 틀렸습니다.'});
    }
    

    const user = result[0];
    //패스워드 일치 여부검사
    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch){
      return res.status(401).json({error:'아이디 또는 비밀번호가 틀립니다.'});
    }

    //토큰생성 1시간
    const token = jwt.sign({id:user.id, username:user.username}, SECRET_KEY,{
      expiresIn:'1h'
    });
    //토근 발급
    res.json({token});

  });
});


