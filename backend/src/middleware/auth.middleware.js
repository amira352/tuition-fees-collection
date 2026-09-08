import jwt from "jsonwebtoken";

/**
 * Verifies the JWT and puts the payload on req.user.
 *
 * A token issued to someone who still has to change their password carries
 * scope "password_change". That token is only accepted by the change-password
 * route, so a user cannot reach the rest of the API until they have chosen a
 * password of their own.
 */
export const authenticate = (options = {}) => {
  const { allowPasswordChangeScope = false } = options;

  return (req, res, next) => {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token is required"
      });
    }

    const token = header.slice("Bearer ".length).trim();

    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

    if (
      payload.scope === "password_change" &&
      allowPasswordChangeScope === false
    ) {
      return res.status(403).json({
        message: "You must change your password before using this service"
      });
    }

    req.user = payload;

    return next();
  };
};

/**
 * Allows the request only if the signed-in user has one of the given roles.
 * Use after authenticate().
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authorization token is required"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action"
      });
    }

    return next();
  };
};
