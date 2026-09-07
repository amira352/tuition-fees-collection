import { login, changePassword } from "../services/auth.service.js";

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const result = await login(email, password);

    return res.status(200).json({
      message: result.mustChangePassword
        ? "Login successful. You must change your password before continuing."
        : "Login successful",
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const changeUserPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const result = await changePassword(req.user, {
      currentPassword,
      newPassword,
      confirmPassword
    });

    return res.status(200).json({
      message: "Password changed successfully",
      ...result
    });
  } catch (error) {
    next(error);
  }
};
