export const authorizeInstitutionAccess = (req, res, next) => {
  const institutionId = req.params.id;

  if (req.user.userId !== institutionId) {
    return res.status(403).json({
      message: "You are not authorized to access this institution"
    });
  }

  next();
};