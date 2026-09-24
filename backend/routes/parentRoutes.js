import { Router } from "express";
import * as parentLoginController from "../controllers/parentController.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = Router();

// Public login flow for parents
router.get(
  "/lookup",
  authenticateToken,
  parentLoginController.lookupParentByNin,
);
router.post("/login", parentLoginController.parentLogin);

// Protected routes for authenticated parent
router.get(
  "/children",
  authenticateToken,
  parentLoginController.getParentChildren,
);
router.get(
  "/children/:studentId",
  authenticateToken,
  parentLoginController.getChildDetails,
);
router.get(
  "/announcements",
  authenticateToken,
  parentLoginController.getParentAnnouncements,
);

export default router;
