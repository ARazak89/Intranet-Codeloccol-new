import { Router } from "express";
import {
  login,
  logout,
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import passport from "passport";

const r = Router();
r.post("/login", login);
r.post("/logout", requireAuth, logout);

export default r;
