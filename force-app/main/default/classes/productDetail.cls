public without sharing class productDetail {
    
@AuraEnabled(cacheable=true)
public static Map<String, Object> getProductDetails(String productId) {
    try {
        // Query product details including the SKU (or another identifier)
        PricebookEntry pricebookEntry = [
            SELECT Id, Product2Id, Product2.Name, Product2.Description, UnitPrice, Product2.QuantityUnitOfMeasure,
            Pricebook2.Name, Product2.ProductCode, CurrencyIsoCode, Product2.StockKeepingUnit
            FROM PricebookEntry
            WHERE Product2Id = :productId AND Pricebook2.Name = 'CI_Quest EStore Price Book'
            LIMIT 1
        ];

        System.debug('Fetched PricebookEntry: ' + pricebookEntry);

        // Get the Product2Id (the actual product ID) from the PricebookEntry record
        String product2Id = pricebookEntry.Product2Id;
        String productSku = pricebookEntry.Product2.ProductCode;
        System.debug('Product2Id: ' + product2Id);
        System.debug('Product SKU: ' + productSku);

        if (String.isNotBlank(product2Id)) {
            // Initialize promotionTargets list outside the if block to ensure it's always accessible
            List<PromotionTarget> promotionTargets = new List<PromotionTarget>();

            try {
                // Fetch promotion targets dynamically using the SKU
                promotionTargets = [
                    SELECT Id, PromotionId, Promotion.Name, TargetProductName, TargetProductSku, 
                    AdjustmentAmount, AdjustmentPercent, Promotion.IsAutomatic
                    FROM PromotionTarget
                    WHERE Promotion.IsAutomatic = true AND TargetProductSku = :productSku
                ];

                System.debug('Fetched PromotionTargets: ' + promotionTargets);
            } catch (QueryException e) {
                // Catch any query-specific exceptions
                System.debug('Error executing SOQL: ' + e.getMessage());
            }

            // Fetch applicable promotion qualifiers dynamically using the SKU
            List<PromotionQualifier> promotionQualifiers = [
                SELECT Id, PromotionId, Promotion.Name, QualifierProductName, QualifierProductSku, 
                Promotion.IsAutomatic
                FROM PromotionQualifier
                WHERE Promotion.IsAutomatic = true AND QualifierProductSku = :productSku
            ];

            System.debug('Fetched PromotionQualifiers: ' + promotionQualifiers);

            Decimal unitPrice = pricebookEntry.UnitPrice;
            Decimal discountedPrice;

            // Apply promotion adjustments dynamically
            for (PromotionTarget target : promotionTargets) {
                if (target.AdjustmentPercent != null) {
                    discountedPrice -= (target.AdjustmentPercent / 100) * unitPrice;
                    System.debug('Applied AdjustmentPercent: ' + target.AdjustmentPercent);
                }
                if (target.AdjustmentAmount != null) {
                    discountedPrice = unitPrice - target.AdjustmentAmount;
                    System.debug('Applied AdjustmentAmount: ' + target.AdjustmentAmount);
                }
            }

            // Log any applicable promotion qualifiers (if required for validation)
            for (PromotionQualifier qualifier : promotionQualifiers) {
                System.debug('PromotionQualifier found: ' + qualifier.Promotion.Name);
            }

            // Log final discounted price
            System.debug('Final Discounted Price: ' + discountedPrice);

            // Return the details as a Map
            Map<String, Object> productDetails = new Map<String, Object>();
            productDetails.put('Product2Id', product2Id);  // Return the Product2Id
            productDetails.put('ProductName', pricebookEntry.Product2.Name);
            productDetails.put('Description', pricebookEntry.Product2.Description);
            productDetails.put('UnitPrice', pricebookEntry.UnitPrice);
            productDetails.put('DiscountedPrice', discountedPrice);
            productDetails.put('CurrencyIsoCode', pricebookEntry.CurrencyIsoCode);
            productDetails.put('AdjustmentAmount', promotionTargets.isEmpty() ? null : promotionTargets[0].AdjustmentAmount);

            return productDetails;

        } else {
            throw new AuraHandledException('Product2Id is not valid or blank.');
        }
    } catch (Exception e) {
        System.debug('Error fetching product details: ' + e.getMessage());
        throw new AuraHandledException('Error fetching product details: ' + e.getMessage());
    }
}

    /*
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
    } */
    
    @AuraEnabled(cacheable=true)
public static List<Map<String, Object>> getVariationProduct(String productId) {
    try {
        System.debug('Start: Fetching variation products for Parent Product ID: ' + productId);
        
        // Step 1: Query ProductAttribute records to get Product IDs
        List<ProductAttribute> productAttributes = [
            SELECT Id, Name, Product.Id, Product.Name, Product.Description, Product.StockKeepingUnit,
            VariantParentId, VariantParent.Name, Quest_Editions__c, Product.CurrencyIsoCode
            FROM ProductAttribute
            WHERE VariantParentId = :productId
        ];
        
        System.debug('Fetched ProductAttributes: ' + productAttributes);
        
        // Step 2: Extract Product SKUs into a list
        List<String> productSKUs = new List<String>();
        for (ProductAttribute attribute : productAttributes) {
            if (attribute.Product != null && attribute.Product.StockKeepingUnit != null) {
                productSKUs.add(attribute.Product.StockKeepingUnit);
            }
        }
        
        System.debug('Extracted Product SKUs: ' + productSKUs);
        
        // Step 3: Query PromotionTarget and PromotionQualifier for the SKUs (Both Target and Qualifier)
        Map<String, Decimal> promotionDiscounts = new Map<String, Decimal>(); // Store discounts based on SKU
        if (!productSKUs.isEmpty()) {
            List<PromotionTarget> promotionTargets = [
                SELECT Id, PromotionId, Promotion.Name, TargetProductSku, AdjustmentAmount, AdjustmentPercent
                FROM PromotionTarget
                WHERE TargetProductSku IN :productSKUs
            ];
            
            System.debug('Fetched Promotion Targets: ' + promotionTargets);
            
            // Map Promotion Discounts for matching Target SKUs
            for (PromotionTarget target : promotionTargets) {
                if (target.AdjustmentPercent != null) {
                    promotionDiscounts.put(target.TargetProductSku, target.AdjustmentPercent);
                }
                if (target.AdjustmentAmount != null) {
                    promotionDiscounts.put(target.TargetProductSku, target.AdjustmentAmount);
                }
            }
            
            // Query Promotion Qualifiers to fetch discounts based on Qualifier SKU
            List<PromotionQualifier> promotionQualifiers = [
                SELECT Id, PromotionId, Promotion.Name, QualifierProductSku, MinimumAmount
                FROM PromotionQualifier 
                WHERE QualifierProductSku IN :productSKUs
            ];
            
            System.debug('Fetched Promotion Qualifiers: ' + promotionQualifiers);
            
            // Map Promotion Discounts for matching Qualifier SKUs
            for (PromotionQualifier qualifier : promotionQualifiers) {
                if (qualifier.MinimumAmount != null) {
                    promotionDiscounts.put(qualifier.QualifierProductSku, qualifier.MinimumAmount);
                }
            }
        }
        
        System.debug('Mapped Promotion Discounts: ' + promotionDiscounts);
        
        // Step 4: Query PricebookEntry for the products
        Map<Id, Decimal> productPrices = new Map<Id, Decimal>();
        Set<Id> productIds = new Set<Id>();
        // Populate productIds from ProductAttributes
        for (ProductAttribute attribute : productAttributes) {
            if (attribute.Product != null) {
                productIds.add(attribute.ProductId);
            }
        }
        
        // Check if productIds is populated
        System.debug('Product IDs for PricebookEntry query: ' + productIds);
        
        if (!productIds.isEmpty()) {
            List<PricebookEntry> pricebookEntries = [
                SELECT Id, Product2Id, UnitPrice, Pricebook2.Name
                FROM PricebookEntry
                WHERE Product2Id IN :productIds
                AND Pricebook2.Name = 'CI_Quest EStore Price Book'
            ];
            
            System.debug('Fetched PricebookEntries: ' + pricebookEntries);
            
            // Map Product IDs to Prices
            for (PricebookEntry entry : pricebookEntries) {
                productPrices.put(entry.Product2Id, entry.UnitPrice);
            }
        }
        
        System.debug('Mapped Product Prices: ' + productPrices);
        
        // Step 5: Create a structured response combining ProductAttributes, Prices, and Discounts
        List<Map<String, Object>> variations = new List<Map<String, Object>>();
        for (ProductAttribute attribute : productAttributes) {
            Map<String, Object> variationDetails = new Map<String, Object>();
            variationDetails.put('AttributeId', attribute.Id);
            variationDetails.put('AttributeName', attribute.Name);
            variationDetails.put('ProductId', attribute.ProductId);
            variationDetails.put('ProductName', attribute.Product.Name);
            variationDetails.put('ProductDescription', attribute.Product.Description);
            variationDetails.put('ProductSKU', attribute.Product.StockKeepingUnit);  // Accessing StockKeepingUnit correctly
            variationDetails.put('VariantParentId', attribute.VariantParentId);
            variationDetails.put('VariantParentName', attribute.VariantParent.Name);
            variationDetails.put('SoftwareVersion', attribute.Quest_Editions__c);
            variationDetails.put('CurrencyIsoCode', attribute.Product.CurrencyIsoCode);

            // Add regular price for all products
            Decimal unitPrice = productPrices.get(attribute.ProductId);
            variationDetails.put('UnitPrice', unitPrice);
            
            System.debug('Initial Price for Product ' + attribute.Product.Name + ': ' + unitPrice);
            
            // Apply discount from promotion if available (using both Target and Qualifier SKUs)
            if (promotionDiscounts.containsKey(attribute.Product.StockKeepingUnit)) {
                Decimal discount = promotionDiscounts.get(attribute.Product.StockKeepingUnit);
                variationDetails.put('AdjustmentAmount', discount);  // Pass adjustment amount

                System.debug('Applied discount for Product SKU ' + attribute.Product.StockKeepingUnit + ': ' + discount);
                
                // Apply the discount directly without using instanceof check
                unitPrice -= discount;
                variationDetails.put('DiscountedPrice', unitPrice);
            }
            
            variations.add(variationDetails);
            
            System.debug('Variation details for Product ' + attribute.Product.Name + ': ' + variationDetails);
        }
        
        System.debug('Final variations list: ' + variations);
        
        return variations;
        
    } catch (Exception e) {
        System.debug('Error fetching product variation details: ' + e.getMessage());
        System.debug('Stack Trace: ' + e.getStackTraceString());
        throw new AuraHandledException('Error fetching product variation details: ' + e.getMessage());
    }
}
    
}