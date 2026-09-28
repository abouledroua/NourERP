import { Router } from "express";
import * as guardianController from "../controllers/guardianController.js";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.js";

const router = Router();

// Protect all routes with auth + admin check
router.use(authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'));

router.get("/", guardianController.getAllGuardians);
router.post("/", guardianController.createGuardian);
router.put("/:id", guardianController.updateGuardian);
router.delete("/:id", guardianController.deleteGuardian);
router.post("/:id/reset-password", guardianController.resetGuardianPassword);
router.get("/:id/children", guardianController.getGuardianChildren);

export default router;
