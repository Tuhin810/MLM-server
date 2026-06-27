import { ProductRepository } from "./ProductRepository.js";
import { prisma } from "../../config/db.js";

const productRepository = new ProductRepository();

export class ProductService {
  async getProducts(filters?: { category?: string; search?: string; sort?: string }) {
    const where: any = {};
    if (filters?.category && filters.category !== "All") {
      where.category = filters.category;
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    const orderBy: any = { createdAt: "desc" };
    if (filters?.sort === "price_asc")  { delete orderBy.createdAt; orderBy.price = "asc"; }
    if (filters?.sort === "price_desc") { delete orderBy.createdAt; orderBy.price = "desc"; }
    if (filters?.sort === "name")       { delete orderBy.createdAt; orderBy.name = "asc"; }

    return productRepository.findAll(where, orderBy);
  }

  async getProductById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new Error("Product not found");
    }
    return product;
  }

  async createProduct(data: any) {
    const { name, description, image, images, price, pointValue, stock, categoryId, subCategoryId, sellingDetails } = data;
    
    const productData: any = {
      name,
      description,
      image: image || (images && images.length > 0 ? images[0] : ""),
      images: images || (image ? [image] : []),
      price: parseFloat(price),
      pointValue: parseInt(pointValue),
      stock: parseInt(stock),
    };

    // Link to category
    if (categoryId) {
      productData.categoryRef = { connect: { id: categoryId } };
      // Also set the legacy string category field
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (cat) productData.category = cat.name;
    }

    if (subCategoryId) {
      productData.subCategory = { connect: { id: subCategoryId } };
    }

    // Create selling details if provided
    if (sellingDetails) {
      productData.sellingDetails = {
        create: {
          mrpPrice: parseFloat(sellingDetails.mrpPrice || 0),
          sellingPrice: parseFloat(sellingDetails.sellingPrice || 0),
          discount: parseFloat(sellingDetails.discount || 0),
          superPointPrice: parseFloat(sellingDetails.superPointPrice || 0),
          pointOfSalePrice: parseFloat(sellingDetails.pointOfSalePrice || 0),
          dealerPrice: parseFloat(sellingDetails.dealerPrice || 0),
          resellerPrice: parseFloat(sellingDetails.resellerPrice || 0),
          productPoint: parseFloat(sellingDetails.productPoint || 0),
          gst: sellingDetails.gst || null,
          sku: sellingDetails.sku || null,
          hsnCode: sellingDetails.hsnCode || null,
          fashionFormats: sellingDetails.fashionFormats || [],
          fashionSizes: sellingDetails.fashionSizes || [],
          weightFormats: sellingDetails.weightFormats || [],
          deliveryCharge: parseFloat(sellingDetails.deliveryCharge || 0),
          returnPolicy: sellingDetails.returnPolicy || null,
          taxes: sellingDetails.taxes || null,
          productDetails: sellingDetails.productDetails || null,
          benefits: sellingDetails.benefits || null,
          features: sellingDetails.features || null,
          leftStock: parseInt(sellingDetails.leftStock || 0),
          availableStates: sellingDetails.availableStates || [],
          productType: sellingDetails.productType || null,
        },
      };
    }

    return productRepository.create(productData);
  }

  async updateProduct(id: string, data: any) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new Error("Product not found");
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.price !== undefined) updateData.price = parseFloat(data.price);
    if (data.pointValue !== undefined) updateData.pointValue = parseInt(data.pointValue);
    if (data.stock !== undefined) updateData.stock = parseInt(data.stock);

    if (data.categoryId !== undefined) {
      if (data.categoryId) {
        updateData.categoryRef = { connect: { id: data.categoryId } };
        const cat = await prisma.category.findUnique({ where: { id: data.categoryId } });
        if (cat) updateData.category = cat.name;
      } else {
        updateData.categoryRef = { disconnect: true };
      }
    }

    if (data.subCategoryId !== undefined) {
      if (data.subCategoryId) {
        updateData.subCategory = { connect: { id: data.subCategoryId } };
      } else {
        updateData.subCategory = { disconnect: true };
      }
    }

    // Update or create selling details
    if (data.sellingDetails) {
      const sd = data.sellingDetails;
      const sellingData: any = {
        mrpPrice: parseFloat(sd.mrpPrice || 0),
        sellingPrice: parseFloat(sd.sellingPrice || 0),
        discount: parseFloat(sd.discount || 0),
        superPointPrice: parseFloat(sd.superPointPrice || 0),
        pointOfSalePrice: parseFloat(sd.pointOfSalePrice || 0),
        dealerPrice: parseFloat(sd.dealerPrice || 0),
        resellerPrice: parseFloat(sd.resellerPrice || 0),
        productPoint: parseFloat(sd.productPoint || 0),
        gst: sd.gst || null,
        sku: sd.sku || null,
        hsnCode: sd.hsnCode || null,
        fashionFormats: sd.fashionFormats || [],
        fashionSizes: sd.fashionSizes || [],
        weightFormats: sd.weightFormats || [],
        deliveryCharge: parseFloat(sd.deliveryCharge || 0),
        returnPolicy: sd.returnPolicy || null,
        taxes: sd.taxes || null,
        productDetails: sd.productDetails || null,
        benefits: sd.benefits || null,
        features: sd.features || null,
        leftStock: parseInt(sd.leftStock || 0),
        availableStates: sd.availableStates || [],
        productType: sd.productType || null,
      };

      updateData.sellingDetails = {
        upsert: {
          create: sellingData,
          update: sellingData,
        },
      };
    }

    return productRepository.update(id, updateData);
  }

  async deleteProduct(id: string) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new Error("Product not found");
    }
    return productRepository.delete(id);
  }
}
