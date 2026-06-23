import { ZodError } from "zod";
export const errorMiddleware = (err, req, res, next) => {
    console.error("Error caught in middleware:", err);
    // 1. Handle Zod validation errors
    if (err instanceof ZodError) {
        const zodErr = err;
        res.status(400).json({
            error: "Validation error",
            details: zodErr.issues.map((e) => ({
                field: e.path.join("."),
                message: e.message,
            })),
        });
        return;
    }
    // 2. Handle Custom Service/Database Errors
    const message = err.message || "Internal server error";
    const statusCode = err.statusCode || (err.message && err.message.includes("not found") ? 404 : 400);
    res.status(statusCode).json({
        error: message,
    });
};
