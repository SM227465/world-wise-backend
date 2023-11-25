const path = require('path');
const express = require('express');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');

// const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/error.controller');

// Routers
const userRouter = require('./routes/user.route');
// const factRouter = require('./routes/fact.route');
// const categoryRouter = require('./routes/category.route');

// setting path for .env file
dotenv.config({ path: './config.env' });

// calling express function and store into a variable
const app = express();

app.set('trust proxy', true);

// setting templating view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1. Global Middlewares
//
app.use(express.static(path.join(__dirname, 'public')));

// i) Implemented cors
app.use(cors());
app.options('*', cors());

// ii) Set security HTTP headers
app.use(helmet());

// iii) Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// iv) Limiting request from same IP (its help us from Bruteforce and DOS/DDOS attacks)
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from your IP, please try again in an hour.',
});
app.use('/api', limiter);

// v) Body parser (reading data from body into req.body) and set limit to 10kb on creating and updating documents
app.use(express.json({ limit: '10kb' }));

// vi) Cookie parser
app.use(cookieParser());

// vii) Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// viii) Data sanitization against XSS (Cross-site scripting)
app.use(xss());

// ix) Prevent parameter pollution (pass all the params inside whitelist array which you want to allow in req.query to avoid unnecessary params by a malicious user)
app.use(hpp({ whitelist: [] }));

// x) Compressing
app.use(compression());

// 2. Routes
// i) Handling available routes
app.use('/api/v1/users', userRouter);
// app.use('/api/v1/facts', factRouter);
// app.use('/api/v1/categories', categoryRouter);

// ii) Handling unavailable routes
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `can not find ${req.originalUrl} on this server`,
  });
});

// 3. Global error handler
app.use(globalErrorHandler);

// exporting app module
module.exports = app;
