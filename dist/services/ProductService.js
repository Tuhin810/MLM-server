import { ProductRepository } from "../repositories/ProductRepository.js";
const productRepository = new ProductRepository();
export class ProductService {
    async getProducts(filters) {
        const where = {};
        if (filters?.category && filters.category !== "All") {
            where.category = filters.category;
        }
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: "insensitive" } },
                { description: { contains: filters.search, mode: "insensitive" } },
            ];
        }
        const orderBy = { createdAt: "desc" };
        if (filters?.sort === "price_asc") {
            delete orderBy.createdAt;
            orderBy.price = "asc";
        }
        if (filters?.sort === "price_desc") {
            delete orderBy.createdAt;
            orderBy.price = "desc";
        }
        if (filters?.sort === "name") {
            delete orderBy.createdAt;
            orderBy.name = "asc";
        }
        return productRepository.findAll(where, orderBy);
    }
    async getProductById(id) {
        const product = await productRepository.findById(id);
        if (!product) {
            throw new Error("Product not found");
        }
        return product;
    }
    async createProduct(data) {
        const { name, description, image, price, pointValue, stock } = data;
        return productRepository.create({
            name,
            description,
            image,
            price: parseFloat(price),
            pointValue: parseInt(pointValue),
            stock: parseInt(stock),
        });
    }
    async updateProduct(id, data) {
        const product = await productRepository.findById(id);
        if (!product) {
            throw new Error("Product not found");
        }
        return productRepository.update(id, {
            name: data.name,
            description: data.description,
            image: data.image,
            price: data.price !== undefined ? parseFloat(data.price) : undefined,
            pointValue: data.pointValue !== undefined ? parseInt(data.pointValue) : undefined,
            stock: data.stock !== undefined ? parseInt(data.stock) : undefined,
        });
    }
    async deleteProduct(id) {
        const product = await productRepository.findById(id);
        if (!product) {
            throw new Error("Product not found");
        }
        return productRepository.delete(id);
    }
}
