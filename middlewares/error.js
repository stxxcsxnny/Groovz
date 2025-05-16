const errorMIddleware = (err, req, res, next) => {
  err.message ||= "internal server error";
  err.statusCode ||= 500;

  if (err.code === 11000) {
    err.message = `Duplicate ${Object.keys(err.keyPattern).join(",")} entered`;
    err.statusCode = 400;
  }

  return res.status(err.statusCode).json({
    success: false,
    message: err,
  });
};

export { errorMIddleware };
