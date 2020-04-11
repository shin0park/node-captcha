const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const request = require('request');
const geoip = require('geoip-lite');


require('dotenv').config();// .env가 process.env에 들어감.

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.set('port', process.env.PORT || 8001);
app.set('trust proxy', true);

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
        httpOnly: true,
        secure: false,
    },
}));
app.use(flash());

app.get('/', (req, res) => {
    res.render('index');
});
app.get('/home', (req, res) => {
    res.render('home');
    return res.end("Home");
});
app.post('/captcha', (req, res) => {
    if (
        req.body.captcha === undefined ||
        req.body.captcha === '' ||
        req.body.captcha === null
    ) {
        return res.json({ "success": false, "msg": "Please select captcha" });
    }
    // Secret Key
    const secretKey = process.env.SECRET_KEY;
    // 사용자의 응답을 검증하기 위해 백엔드와 reCAPTCHA 서버간의 통신을 해준다.

    let ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;//node에서 ip를 가져오는 방법.

    //ip ='58.116.0.0'; //중국 ip
    // console.log(ip);
    // const geo = geoip.lookup(ip);
    // console.log(geo);

    // let verifyUrl = '';
    // if (geo.country == 'CN') {
    //     verifyUrl = `https://recaptcha.net/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.captcha}&remoteip=${ip}`;
    // } else {
    //     verifyUrl = `https://google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.captcha}&remoteip=${ip}`;
    // }
    const verifyUrl = `https://google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.captcha}&remoteip=${ip}`;
    //const verifyUrl = `https://recaptcha.net/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.captcha}&remoteip=${ip}`;
    //vpn으로 중국ip를 설정할 경우 localhost이기 때문에 geoip 작동하지 않는다.

    // 검증하기 위한 구글에 request 요청
    request(verifyUrl, (err, response, body) => {
        body = JSON.parse(body);
        console.log(body);
        // If Not Successful
        if (body.success !== undefined && !body.success) {
            return res.json({ "success": false, "msg": "Failed captcha verification" });
        }
        //If Successful
        return res.json({ "success": true, "msg": "Captcha passed" });
    });
});

app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

app.listen(app.get('port'), () => {
    console.log(`operating server in ${app.get('port')} port.`);
});