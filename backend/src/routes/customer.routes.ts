import { Router } from "express";
import {
  getDemoCustomers,
  createCustomer,
  getCustomerConversation,
  sendCustomerMessage,
} from "../controllers/customer.controller";

const router = Router();

// Customer endpoints do NOT require agent authentication
router.get("/customers", getDemoCustomers);
router.post("/create", createCustomer);
router.get("/conversation/:customerId", getCustomerConversation);
router.post("/message", sendCustomerMessage);

export default router;
