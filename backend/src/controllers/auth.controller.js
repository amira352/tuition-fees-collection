import { login } from "../services/auth.service.js";

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
      message: "Login successful",
      ...result
    });
  } catch (error) {
    next(error);
  }
};