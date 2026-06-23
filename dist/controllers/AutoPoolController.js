import { AutoPoolService } from "../services/AutoPoolService.js";
const autoPoolService = new AutoPoolService();
export class AutoPoolController {
    async join(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const member = await autoPoolService.joinAutoPool(req.user.id);
            res.status(201).json({
                message: "Successfully joined the Auto Pool system!",
                member,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTree(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            // Allow passing a userId query parameter to let admin view any user's tree
            const userId = req.query.userId || req.user.id;
            const tree = await autoPoolService.getTree(userId);
            res.status(200).json(tree);
        }
        catch (error) {
            next(error);
        }
    }
    async getIncome(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const logs = await autoPoolService.getIncomeLogs(req.user.id);
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
}
