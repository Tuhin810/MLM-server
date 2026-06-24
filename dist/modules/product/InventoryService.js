export class InventoryService {
    /**
     * Route stock allocation for a purchase according to the path:
     * City Franchise -> Tehsil Franchise -> District Franchise -> State Franchise -> Vendor (or global stock).
     */
    async routeInventory(tx, buyerId, productId, quantity) {
        // 1. Get buyer's shipping address (default) or profile location
        const defaultAddress = await tx.address.findFirst({
            where: { userId: buyerId, isDefault: true }
        });
        const buyerProfile = await tx.user.findUnique({
            where: { id: buyerId }
        });
        const city = defaultAddress?.city || buyerProfile?.city || "";
        const state = defaultAddress?.state || buyerProfile?.state || "";
        const district = buyerProfile?.district || "";
        const tehsil = buyerProfile?.tehsil || "";
        const product = await tx.product.findUnique({
            where: { id: productId }
        });
        if (!product) {
            throw new Error("Product not found");
        }
        console.log(`[Inventory Router] Sourcing ${quantity} of "${product.name}" for buyer in City: "${city}", Tehsil: "${tehsil}", District: "${district}", State: "${state}"`);
        // ────────────────────────────────────────────────────────────────
        // STEP 1: Check City Franchise
        // ────────────────────────────────────────────────────────────────
        if (city) {
            const cityFranchise = await tx.user.findFirst({
                where: { role: "CITY_FRANCHISE", city: { equals: city, mode: "insensitive" }, status: "ACTIVE" }
            });
            if (cityFranchise) {
                const inv = await tx.franchiseInventory.findUnique({
                    where: { franchiseId_productId: { franchiseId: cityFranchise.id, productId } }
                });
                if (inv && inv.quantity >= quantity) {
                    await tx.franchiseInventory.update({
                        where: { id: inv.id },
                        data: { quantity: { decrement: quantity } }
                    });
                    return { sourcedFrom: "CITY_FRANCHISE", sourceName: cityFranchise.name };
                }
            }
        }
        // ────────────────────────────────────────────────────────────────
        // STEP 2: Check Tehsil Franchise
        // ────────────────────────────────────────────────────────────────
        if (tehsil) {
            const tehsilFranchise = await tx.user.findFirst({
                where: { role: "TEHSIL_FRANCHISE", tehsil: { equals: tehsil, mode: "insensitive" }, status: "ACTIVE" }
            });
            if (tehsilFranchise) {
                const inv = await tx.franchiseInventory.findUnique({
                    where: { franchiseId_productId: { franchiseId: tehsilFranchise.id, productId } }
                });
                if (inv && inv.quantity >= quantity) {
                    await tx.franchiseInventory.update({
                        where: { id: inv.id },
                        data: { quantity: { decrement: quantity } }
                    });
                    return { sourcedFrom: "TEHSIL_FRANCHISE", sourceName: tehsilFranchise.name };
                }
            }
        }
        // ────────────────────────────────────────────────────────────────
        // STEP 3: Check District Franchise
        // ────────────────────────────────────────────────────────────────
        if (district) {
            const districtFranchise = await tx.user.findFirst({
                where: { role: "DISTRICT_FRANCHISE", district: { equals: district, mode: "insensitive" }, status: "ACTIVE" }
            });
            if (districtFranchise) {
                const inv = await tx.franchiseInventory.findUnique({
                    where: { franchiseId_productId: { franchiseId: districtFranchise.id, productId } }
                });
                if (inv && inv.quantity >= quantity) {
                    await tx.franchiseInventory.update({
                        where: { id: inv.id },
                        data: { quantity: { decrement: quantity } }
                    });
                    return { sourcedFrom: "DISTRICT_FRANCHISE", sourceName: districtFranchise.name };
                }
            }
        }
        // ────────────────────────────────────────────────────────────────
        // STEP 4: Check State Franchise
        // ────────────────────────────────────────────────────────────────
        if (state) {
            const stateFranchise = await tx.user.findFirst({
                where: { role: "STATE_FRANCHISE", state: { equals: state, mode: "insensitive" }, status: "ACTIVE" }
            });
            if (stateFranchise) {
                const inv = await tx.franchiseInventory.findUnique({
                    where: { franchiseId_productId: { franchiseId: stateFranchise.id, productId } }
                });
                if (inv && inv.quantity >= quantity) {
                    await tx.franchiseInventory.update({
                        where: { id: inv.id },
                        data: { quantity: { decrement: quantity } }
                    });
                    return { sourcedFrom: "STATE_FRANCHISE", sourceName: stateFranchise.name };
                }
            }
        }
        // ────────────────────────────────────────────────────────────────
        // STEP 5: Fallback to Vendor (or global stock)
        // ────────────────────────────────────────────────────────────────
        if (product.vendorId) {
            const vendor = await tx.user.findFirst({
                where: { id: product.vendorId, role: "VENDOR", status: "ACTIVE" }
            });
            if (vendor) {
                // Deduct from global/product stock directly
                if (product.stock >= quantity) {
                    await tx.product.update({
                        where: { id: productId },
                        data: { stock: { decrement: quantity } }
                    });
                    return { sourcedFrom: "VENDOR", sourceName: vendor.name };
                }
            }
        }
        // Default system product or general fallback to global store stock
        if (product.stock >= quantity) {
            await tx.product.update({
                where: { id: productId },
                data: { stock: { decrement: quantity } }
            });
            return { sourcedFrom: "SYSTEM", sourceName: "Main Catalog Depot" };
        }
        throw new Error(`Out of Stock: Sourcing path depleted. product: "${product.name}"`);
    }
}
