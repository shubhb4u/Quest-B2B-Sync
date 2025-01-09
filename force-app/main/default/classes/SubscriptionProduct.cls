public with sharing class SubscriptionProduct {
    @AuraEnabled(cacheable=true)
    public static PricebookEntry getPricebookEntry(String productId) {
        try {
            // Query the PricebookEntry for the given productId
            PricebookEntry prodSellModOpt = [
                SELECT Id, Name, Product2Id, ProductSellingModelId
                FROM PricebookEntry
                WHERE Product2Id = :productId
                LIMIT 1
            ];
            System.debug('Product Selling Model Option found: ' + prodSellModOpt);
            
            // If no PricebookEntry is found or ProductSellingModelId is null, throw an error
            if (prodSellModOpt == null || prodSellModOpt.ProductSellingModelId == null) {
                throw new AuraHandledException('No Product Selling Model found for the product.');
            }

            // Query the ProductSellingModel related to the PricebookEntry
            PricebookEntry prodSellModl = [
                SELECT Id, Name, ProductSellingModel.PricingTerm, 
                       ProductSellingModel.PricingTermUnit, ProductSellingModel.SellingModelType, UnitPrice
                FROM PricebookEntry
                WHERE Id = :prodSellModOpt.ProductSellingModelId
                LIMIT 1
            ];
            System.debug('Product Selling Model retrieved: ' + prodSellModl);

            return prodSellModl;
        } catch (Exception e) {
            System.debug('Error fetching product selling model details: ' + e.getMessage());
            throw new AuraHandledException('Error fetching product details selling model: ' + e.getMessage());
        }
    }
}