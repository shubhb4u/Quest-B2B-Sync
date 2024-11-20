public without sharing class productDetail {
        @AuraEnabled(cacheable=true)
        public static PricebookEntry getProductDetails(String productId) {
            try {
                return [
                    SELECT Id, Product2.Name, Product2.Description, UnitPrice, Product2.QuantityUnitOfMeasure
                    FROM PricebookEntry
                    WHERE Product2Id = :productId
                    LIMIT 1
                ];
            } catch (Exception e) {
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
                ProductSellingModel prodSellModl = [SELECT Id,Name, PricingTerm, PricingTermUnit,SellingModelType
                                                    FROM ProductSellingModel
                                                    WHERE Id = :prodSellModOpt.ProductSellingModelId
                                                    LIMIT 1];
                return prodSellModl;
            } catch (Exception e) {
                throw new AuraHandledException('Error fetching product details selling model: ' + e.getMessage());
            }
        }

        // @AuraEnabled(cacheable=true)
        // public static ProductVariation getVariationProduct(string productId){
        //     try {
        //         ProductAttribute prodAtt = [SELECT Id, Name, Product.Name, Product.Description FROM ProductAttribute];
        //     } catch (Exception e) {
        //         throw new AuraHandledException('Error fetching product variation details: ' + e.getMessage());
        //     }
        // }
    }