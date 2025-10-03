import { Router } from "express";
import {
  login,
} from "../controllers/authController.js";
import passport from "passport";

const r = Router();
r.post("/login", login);

export default r;
