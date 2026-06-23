import { ProductService } from "../services/ProductService.js";
import { productSchema } from "../utils/validation.js";
const productService = new ProductService();
export class ProductController {
    async getProducts(req, res, next) {
        try {
            const { category, search, sort } = req.query;
            const products = await productService.getProducts({ category, search, sort });
            res.status(200).json(products);
        }
        catch (error) {
            next(error);
        }
    }
    async getProductById(req, res, next) {
        try {
            const product = await productService.getProductById(req.params.id);
            res.status(200).json(product);
        }
        catch (error) {
            next(error);
        }
    }
    async createProduct(req, res, next) {
        try {
            const parsedData = productSchema.parse(req.body);
            const product = await productService.createProduct(parsedData);
            res.status(201).json(product);
        }
        catch (error) {
            next(error);
        }
    }
    async updateProduct(req, res, next) {
        try {
            const product = await productService.updateProduct(req.params.id, req.body);
            res.status(200).json(product);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteProduct(req, res, next) {
        try {
            await productService.deleteProduct(req.params.id);
            res.status(200).json({ message: "Product deleted successfully" });
        }
        catch (error) {
            next(error);
        }
    }
}
