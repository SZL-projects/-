// טיפול בשגיאות גלובלי
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // שגיאת MongoDB - CastError
  if (err.name === 'CastError') {
    const message = 'מזהה לא תקין';
    error = { message, statusCode: 400 };
  }

  // שגיאת MongoDB - Duplicate Key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `הערך ${err.keyValue[field]} כבר קיים במערכת`;
    error = { message, statusCode: 400 };
  }

  // שגיאת MongoDB - Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'שגיאת שרת',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
