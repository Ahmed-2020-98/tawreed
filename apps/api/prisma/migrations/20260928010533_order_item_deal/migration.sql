-- DropIndex
DROP INDEX "buyer_companies_searchText_trgm_idx";

-- DropIndex
DROP INDEX "products_searchText_trgm_idx";

-- DropIndex
DROP INDEX "suppliers_searchText_trgm_idx";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "dealId" UUID;
