import { OrderService } from "./OrderService.js";
import { orderSchema } from "./orderValidation.js";
const orderService = new OrderService();
export class OrderController {
    async createOrder(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const parsedData = orderSchema.parse(req.body);
            const order = await orderService.createOrder(req.user.id, parsedData.productId, parsedData.quantity);
            res.status(201).json(order);
        }
        catch (error) {
            next(error);
        }
    }
    async getOrderHistory(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const orders = await orderService.getOrderHistory(req.user.id);
            res.status(200).json(orders);
        }
        catch (error) {
            next(error);
        }
    }
}
