export const errorHandler = (err, req, res, next) => {

  console.error(err);

  if (err.message === "Invalid credentials") {
    return res.status(401).json({
      message: "Invalid credentials"
    });
  }

  return res.status(500).json({
    message: "Internal server error"
  });
};