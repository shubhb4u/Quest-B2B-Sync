public without sharing class productDetail {
        @AuraEnabled(cacheable=true)
        public static PricebookEntry getProductDetails(String productId) {
            try {
                return [
                    SELECT Id, Product2.Name, Product2.Description, UnitPrice, Product2.QuantityUnitOfMeasure,
                          Product2.isDiscounted__c, Product2.isDiscountedAmount__c, Pricebook2.Name,
                          Product2.Adjustment_Amount__c, Product2.Adjustment_Percent__c, CurrencyIsoCode
                    FROM PricebookEntry
                    WHERE Product2Id = :productId and Pricebook2.Name = 'CI_Quest EStore Price Book'
                   LIMIT 1
                ];
            } catch (Exception e) {
                System.debug('Error fetching product details: ' + e.getMessage());
                throw new AuraHandledException('Error fetching product details: ' + e.getMessage());
            }
        }

        @AuraEnabled(cacheable=true)
        public static ProductSellingModel getProductSellingModel(String productId) {
            try {
                ProductSellingModelOption prodSellModOpt = [SELECT Id, ProductSellingModelId, Product2Id
                                                            FROM ProductSellingModelOption
                                                            WHERE Product2Id = :productId
                                                            LIMIT 1];
                System.debug('Product Selling Model Option found: ' + prodSellModOpt);

                ProductSellingModel prodSellModl = [SELECT Id,Name, PricingTerm, PricingTermUnit,SellingModelType
                                                    FROM ProductSellingModel
                                                    WHERE Id = :prodSellModOpt.ProductSellingModelId
                                                    LIMIT 1];

                System.debug('Product Selling Model retrieved: ' + prodSellModl);
                return prodSellModl;
            } catch (Exception e) {
                System.debug('Error fetching product selling model details: ' + e.getMessage());
                throw new AuraHandledException('Error fetching product details selling model: ' + e.getMessage());
            }
        }

@AuraEnabled(cacheable=true)
public static List<Map<String, Object>> getVariationProduct(String productId) {
    try {
        System.debug('Start: Fetching variation products for Parent Product ID: ' + productId);

        // Step 1: Query ProductAttribute records to get Product IDs
        System.debug('Querying ProductAttribute for VariantParentId: ' + productId);
        List<ProductAttribute> productAttributes = [
            SELECT Id, Name, Product.Id, Product.Name, Product.Description, Product.StockKeepingUnit,
                   VariantParentId, VariantParent.Name, Quest_Editions__c, Product.CurrencyIsoCode
            FROM ProductAttribute
            WHERE VariantParentId = :productId
        ];
        System.debug('Product Attributes found: ' + productAttributes);

        // Step 2: Extract Product IDs into a list
        Set<Id> productIds = new Set<Id>();
        for (ProductAttribute attribute : productAttributes) {
            if (attribute.ProductId != null) { // Ensure ProductId is not null
                productIds.add(attribute.ProductId);
            }
        }
        System.debug('Extracted Product IDs: ' + productIds);

        // Step 3: Query PricebookEntry for the products
        System.debug('Querying PricebookEntry for Product IDs: ' + productIds);
        Map<Id, Decimal> productPrices = new Map<Id, Decimal>();
        Map<Id, Map<String, Object>> productDiscountDetails = new Map<Id, Map<String, Object>>();
        if (!productIds.isEmpty()) {
            List<PricebookEntry> pricebookEntries = [
                SELECT Id, Product2Id, UnitPrice, Pricebook2.Name,
                       Product2.isDiscounted__c, Product2.isDiscountedAmount__c,
                       Product2.Adjustment_Amount__c, Product2.Adjustment_Percent__c,Product2.CurrencyIsoCode
                FROM PricebookEntry
                WHERE Product2Id IN :productIds
                AND Pricebook2.Name = 'CI_Quest EStore Price Book'
            ];
            System.debug('Pricebook Entries found: ' + pricebookEntries);

            // Map Product IDs to Prices and Discounts
            for (PricebookEntry entry : pricebookEntries) {
                productPrices.put(entry.Product2Id, entry.UnitPrice);

                // Store discount details
                Map<String, Object> discountDetails = new Map<String, Object>();
                discountDetails.put('isDiscounted', entry.Product2.isDiscounted__c);
                discountDetails.put('isDiscountedAmount', entry.Product2.isDiscountedAmount__c);
                discountDetails.put('AdjustmentAmount', entry.Product2.Adjustment_Amount__c);
                discountDetails.put('AdjustmentPercent', entry.Product2.Adjustment_Percent__c);
                discountDetails.put('CurrencyIsoCode', entry.Product2.CurrencyIsoCode);
                productDiscountDetails.put(entry.Product2Id, discountDetails);
            }
            System.debug('Product prices mapped: ' + productPrices);
            System.debug('Product discount details mapped: ' + productDiscountDetails);
        }
        // Filter productDiscountDetails to include only products where isDiscounted = true
        Map<Id, Map<String, Object>> discountedProductDetails = new Map<Id, Map<String, Object>>();
        for (Id singleProductId : productDiscountDetails.keySet()) {
            Map<String, Object> discountDetails = productDiscountDetails.get(singleProductId);
             System.debug('Discount Details for Product ID ' + singleProductId + ': ' + discountDetails);
         if (discountDetails != null && discountDetails.containsKey('isDiscountedAmount') && (Boolean) discountDetails.get('isDiscountedAmount') == true) {
        	discountedProductDetails.put(singleProductId, discountDetails);
    }
        }

        System.debug('Discounted Product details mapped: ' + discountedProductDetails);

        // Step 4: Query Product Selling Models for the variation products
        Map<Id, ProductSellingModel> productSellingModels = new Map<Id, ProductSellingModel>();
        Map<Id, Id> productToSellingModel = new Map<Id, Id>();
        if (!productIds.isEmpty()) {
            System.debug('Querying ProductSellingModelOption for Product IDs: ' + productIds);
            List<ProductSellingModelOption> sellingModelOptions = [
                SELECT Id, ProductSellingModelId, Product2Id
                FROM ProductSellingModelOption
                WHERE Product2Id IN :productIds
            ];
            System.debug('Product Selling Model Options found: ' + sellingModelOptions);

            // Collect ProductSellingModelIds
            Set<Id> sellingModelIds = new Set<Id>();
            for (ProductSellingModelOption option : sellingModelOptions) {
                if (option.ProductSellingModelId != null) {
                    sellingModelIds.add(option.ProductSellingModelId);
                    productToSellingModel.put(option.Product2Id, option.ProductSellingModelId);
                }
            }
            System.debug('Collected Product Selling Model IDs: ' + sellingModelIds);

            if (!sellingModelIds.isEmpty()) {
                System.debug('Querying ProductSellingModel for Selling Model IDs: ' + sellingModelIds);
                List<ProductSellingModel> sellingModels = [
                    SELECT Id, Name, PricingTerm, PricingTermUnit, SellingModelType
                    FROM ProductSellingModel
                    WHERE Id IN :sellingModelIds
                ];
                System.debug('Product Selling Models found: ' + sellingModels);

                // Map ProductSellingModelId to ProductSellingModel
                for (ProductSellingModel model : sellingModels) {
                    productSellingModels.put(model.Id, model);
                }
            }
            System.debug('Mapped Product Selling Models: ' + productSellingModels);
        }

        // Step 5: Create a structured response combining ProductAttributes, Prices, and Discounts
        System.debug('Creating structured response for variation products');
        List<Map<String, Object>> variations = new List<Map<String, Object>>();
        for (ProductAttribute attribute : productAttributes) {
            Map<String, Object> variationDetails = new Map<String, Object>();
            variationDetails.put('AttributeId', attribute.Id);
            variationDetails.put('AttributeName', attribute.Name);
            variationDetails.put('ProductId', attribute.ProductId);
            variationDetails.put('ProductName', attribute.Product.Name);
            variationDetails.put('ProductDescription', attribute.Product.Description);
            variationDetails.put('ProductSKU', attribute.Product.StockKeepingUnit);
            variationDetails.put('VariantParentId', attribute.VariantParentId);
            variationDetails.put('VariantParentName', attribute.VariantParent.Name);
            variationDetails.put('SoftwareVersion', attribute.Quest_Editions__c);
            variationDetails.put('CurrencyIsoCode', attribute.Product.CurrencyIsoCode);

            // Add regular price for all products
            Decimal unitPrice = productPrices.get(attribute.ProductId);
            variationDetails.put('UnitPrice', unitPrice);

            // Apply discount for discounted products
            if (productDiscountDetails.containsKey(attribute.ProductId)) {
                Map<String, Object> discountDetails = productDiscountDetails.get(attribute.ProductId);
                System.debug('Discount details for Product ID ' + attribute.ProductId + ': ' + discountDetails);

                if ((Boolean) discountDetails.get('isDiscountedAmount')) {
                    Decimal discountedPrice = unitPrice;

                    // Apply percentage discount if applicable
                    if (discountDetails.get('AdjustmentPercent') != null) {
                        discountedPrice -= (Decimal) discountDetails.get('AdjustmentPercent') / 100 * unitPrice;
                    }
                    // Apply amount discount if applicable
                    if (discountDetails.get('AdjustmentAmount') != null) {
                        discountedPrice -= (Decimal) discountDetails.get('AdjustmentAmount');
                    } else {
            				System.debug('No AdjustmentAmount for Product ID ' + attribute.ProductId);
        				}


                    // Only show discounted price if the product is discounted
                    variationDetails.put('DiscountedPrice', discountedPrice);
                    System.debug('Calculated discounted price for Product ID ' + attribute.ProductId + ': ' + discountedPrice);
                }
            }

            // Add Selling Model details if available
            Id sellingModelId = productToSellingModel.get(attribute.ProductId);
            if (sellingModelId != null && productSellingModels.containsKey(sellingModelId)) {
                ProductSellingModel sellingModel = productSellingModels.get(sellingModelId);
                variationDetails.put('SellingModelName', sellingModel.Name);
                variationDetails.put('PricingTerm', sellingModel.PricingTerm);
                variationDetails.put('PricingTermUnit', sellingModel.PricingTermUnit);
                variationDetails.put('SellingModelType', sellingModel.SellingModelType);
                System.debug('Added Selling Model details for Product ID ' + attribute.ProductId + ': ' + sellingModel);
            }

            variations.add(variationDetails);
        }
        System.debug('Final variations list prepared: ' + variations);
        return variations;
    } catch (Exception e) {
        System.debug('Error fetching product variation details: ' + e.getMessage());
        throw new AuraHandledException('Error fetching product variation details: ' + e.getMessage());
    }
}

     // Fetch discounted products and calculate their final prices
     @AuraEnabled(cacheable=true)
     public static List<Product2> getProductRecsForDiscount() {

         try {
             List<Product2> productListForDiscount;

             // Create a Map to store Product2Id and UnitPrice from PricebookEntry
             Map<Id, Decimal> priceMap = new Map<Id, Decimal>();

             List<PricebookEntry> productList = [
                 SELECT Id, Product2Id, Product2.Name, Product2.ProductCode, Product2.Content_Type__c, Product2.Description,
                     UnitPrice, Pricebook2.Name, Product2.isDiscounted__c, Product2.isDiscountedAmount__c,
                     Product2.Adjustment_Amount__c, Product2.Adjustment_Percent__c
                 FROM PricebookEntry
                 WHERE Pricebook2.Name = 'CI_Quest EStore Price Book'
             ];

             // Populate the priceMap with Product2Id and UnitPrice from the query result
             for (PricebookEntry pr : productList) {
                 if (!priceMap.containsKey(pr.Product2Id)) {
                     priceMap.put(pr.Product2Id, pr.UnitPrice);
                 }
             }

             productListForDiscount = [
                 SELECT Id, Name, isDiscounted__c, isDiscountedAmount__c, Adjustment_Amount__c,
                 Adjustment_Percent__c, Final_price__c
                 FROM Product2
                 WHERE (isDiscounted__c = true OR isDiscountedAmount__c = true)
             ];

             // Calculate the final price for each discounted product
             for (Product2 prod : productListForDiscount) {
                 if (priceMap.containsKey(prod.Id)) {
                     prod.Final_price__c = calculateDiscount(prod, priceMap);
                 } else {
                     System.debug('Product not found in priceMap: ' + prod.Id);
                 }
             }

             System.debug('ProductList for Discount: ' + productListForDiscount);
             return productListForDiscount;

         } catch (Exception e) {
             System.debug('Error retrieving discounted products: ' + e.getMessage());
             return new List<Product2>(); // Return an empty list in case of an error
         }

     }

     // Method to calculate the final price based on discount
     public static Decimal calculateDiscount(Product2 product, Map<Id, Decimal> priceMap) {
         Decimal finalPrice = priceMap.get(product.Id);

         if (product.isDiscounted__c) {
             finalPrice -= (product.Adjustment_Percent__c / 100) * finalPrice;
         } else if (product.isDiscountedAmount__c && product.Adjustment_Amount__c != null) {
             finalPrice -= product.Adjustment_Amount__c;
         }

         return finalPrice;
     }

}