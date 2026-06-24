import { OrderRepository } from "./OrderRepository.js";
import { ProductRepository } from "../product/ProductRepository.js";
import { UserRepository } from "../auth/UserRepository.js";
import { WalletRepository } from "../wallet/WalletRepository.js";
import { prisma } from "../../config/db.js";
import { TransactionType } from "@prisma/client";
import { InventoryService } from "../product/InventoryService.js";
import { commissionQueue } from "../../config/queue.js";
const inventoryService = new InventoryService();
const orderRepository = new OrderRepository();
const productRepository = new ProductRepository();
const userRepository = new UserRepository();
const walletRepository = new WalletRepository();
export class OrderService {
    async createOrder(userId, productId, quantity) {
        const qty = parseInt(quantity) || 1;
        // 1. Verify User
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        // 2. Verify Product & Stock
        const product = await productRepository.findById(productId);
        if (!product) {
            throw new Error("Product not found");
        }
        if (product.stock < qty) {
            throw new Error(`Insufficient stock. Only ${product.stock} items left.`);
        }
        const totalAmount = product.price * qty;
        const earnedPoints = product.pointValue * qty;
        // 3. Verify Wallet Balance
        if (user.walletBalance < totalAmount) {
            throw new Error(`Insufficient wallet balance. Total cost is ₹${totalAmount}, but you only have ₹${user.walletBalance}.`);
        }
        // 4. Run Transaction
        const order = await prisma.$transaction(async (tx) => {
            // a. Deduct Product Stock using the Franchise Routing Engine
            const routeResult = await inventoryService.routeInventory(tx, userId, productId, qty);
            console.log(`[Order Sourced] Sourced from: ${routeResult.sourcedFrom} (${routeResult.sourceName})`);
            // b. Update Wallet Balance (DEBIT totalAmount) & Points (CREDIT earnedPoints)
            await tx.wallet.update({
                where: { userId },
                data: {
                    balance: { decrement: totalAmount },
                    points: { increment: earnedPoints },
                },
            });
            // c. Sync User balances
            await tx.user.update({
                where: { id: userId },
                data: {
                    walletBalance: { decrement: totalAmount },
                    pointBalance: { increment: earnedPoints },
                },
            });
            // d. Create Wallet Transaction log
            await tx.walletTransaction.create({
                data: {
                    userId,
                    amount: totalAmount,
                    type: TransactionType.DEBIT,
                    description: `Purchased product: ${product.name} (x${qty})`,
                },
            });
            // e. Create Order
            const newOrder = await tx.order.create({
                data: {
                    userId,
                    productId,
                    quantity: qty,
                    totalAmount,
                },
                include: {
                    product: true,
                },
            });
            return newOrder;
        });
        try {
            await commissionQueue.add("process-commission", {
                userId,
                amount: totalAmount,
                orderId: order.id,
                itemType: "PRODUCT",
            });
        }
        catch (err) {
            console.error("[Queue Error] Failed to queue commission job:", err);
        }
        return order;
    }
    async getOrderHistory(userId) {
        return orderRepository.findByUserId(userId);
    }
    async getAllOrders() {
        return orderRepository.findAll();
    }
}
