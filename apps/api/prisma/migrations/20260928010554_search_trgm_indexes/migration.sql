-- CreateIndex
CREATE INDEX "buyer_companies_searchText_idx" ON "buyer_companies" USING GIN ("searchText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "products_searchText_idx" ON "products" USING GIN ("searchText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "suppliers_searchText_idx" ON "suppliers" USING GIN ("searchText" gin_trgm_ops);
