import { Router } from "express";
import {
  cancelRequest,
  listConnections,
  listRequests,
  removeConnection,
  respondToRequest,
  sendRequest,
} from "../controllers/connection.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", listConnections);
router.get("/requests", listRequests);
router.post("/requests", sendRequest);
router.patch("/requests/:id", respondToRequest);
router.delete("/requests/:id", cancelRequest);
router.delete("/:userId", removeConnection);

export default router;
