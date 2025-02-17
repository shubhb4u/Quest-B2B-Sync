public without sharing class ProductTile {
    // Previous class created by Shubham
     // @AuraEnabled(cacheable=true)
     // public static List<PricebookEntry> getProductRecs() {
     //     List<PricebookEntry> productList = [
     //             SELECT Id, Product2Id, Product2.Name,  Product2.isWishlistItem_Quest__c, Product2.Family, Product2.QuantityUnitOfMeasure, Product2.SBQQ__PricingMethod__c, Product2.ProductCode, Product2.Description,
     //                 UnitPrice, Pricebook2.Name, Product2.CurrencyIsoCode
     //             FROM PricebookEntry
     //             WHERE Pricebook2.Name = 'CI_Quest EStore Price Book' and Product2.productClass != 'Variation'  ORDER BY Product2.Name
     //             // LIMIT :pageSize OFFSET :offset
     //         ];
 
     //     System.debug('ProductList: ' + productList);
     //     return productList;
     // }
     
     // Added by Sajal
     @AuraEnabled(cacheable=true)
     public static List<PricebookEntry> getProductRecs(String searchKey) {
         // Debug the searchKey value
         System.debug('Search Key: ' + searchKey);
         String searchPattern = '%' + searchKey + '%';
 
         // Construct the query dynamically based on searchKey presence
         List<PricebookEntry> productList;
 
         if (String.isBlank(searchKey)) {
             // If no search key is provided, fetch all products
             productList = [
                 SELECT Id, Product2Id, Product2.Name, Product2.isWishlistItem_Quest__c, Product2.Family, Product2.QuantityUnitOfMeasure, Product2.SBQQ__PricingMethod__c, Product2.ProductCode, Product2.Description,
                     UnitPrice, Pricebook2.Name, Product2.CurrencyIsoCode
                 FROM PricebookEntry
                 WHERE Pricebook2.Name = 'CI_Quest EStore Price Book' AND Product2.productClass != 'Variation'
                 ORDER BY Product2.Name
             ];
         } else {
             // If search key is provided, filter products by name or SKU
            productList = [
                 SELECT Id, Product2Id, Product2.Name, Product2.isWishlistItem_Quest__c, Product2.Family, 
                        Product2.QuantityUnitOfMeasure, Product2.SBQQ__PricingMethod__c, Product2.ProductCode, 
                        Product2.Description, UnitPrice, Pricebook2.Name, Product2.CurrencyIsoCode
                 FROM PricebookEntry
                 WHERE Pricebook2.Name = 'CI_Quest EStore Price Book' 
                   AND Product2.productClass != 'Variation'
                   AND (Product2.Name LIKE :searchPattern 
                        OR Product2.ProductCode LIKE :searchPattern 
                        OR Product2.Family LIKE :searchPattern 
                        OR Product2.Description LIKE :searchPattern)
                 ORDER BY Product2.Name
             ];
         }
 
         // Debug the retrieved product list
         System.debug('ProductList: ' + productList);
         return productList;
     } 
 
 /* Previous Class created by Shubham
     @AuraEnabled(cacheable=true)
     public static List<PricebookEntry> getProdId(String catId){
 
         System.debug('ProductCategory Id: ' +catId);
 
         List<ProductCategoryProduct> prodCatProds = [SELECT ProductId,ProductCategoryId 
                                                     FROM ProductCategoryProduct 
                                                     WHERE ProductCategoryId = :catId];
         System.debug('prodCatProds: ' +prodCatProds);
         List<Id> prodIds = new List<Id>();
         for(ProductCategoryProduct prodCatProd : prodCatProds){
             prodIds.add(prodCatProd.ProductId);
         }
         
         List<PricebookEntry> productList = [
                 SELECT Id, Product2Id, Product2.Name, Product2.ProductCode,  Product2.isWishlistItem_Quest__c, Product2.Family, Product2.QuantityUnitOfMeasure, Product2.SBQQ__PricingMethod__c, Product2.Description,
                     UnitPrice, Pricebook2.Name, Product2.CurrencyIsoCode
                 FROM PricebookEntry
                 WHERE Pricebook2.Name = 'CI_Quest EStore Price Book' and Product2Id in : prodIds and Product2.productClass != 'Variation'  ORDER BY Product2.Name
                 // LIMIT :pageSize OFFSET :offset
             ];
 
         System.debug('ProductList: ' + productList);
         return productList; 
     } */
     
     // Added by Sajal
   @AuraEnabled(cacheable=true)
     public static List<PricebookEntry> getProdId(String catId, String searchKey) {
         System.debug('ProductCategory Id: ' + catId);
         System.debug('Search Key: ' + searchKey);
 
         List<ProductCategoryProduct> prodCatProds = [
             SELECT ProductId, ProductCategoryId 
             FROM ProductCategoryProduct 
             WHERE ProductCategoryId = :catId
         ];
         
         List<Id> prodIds = new List<Id>();
         for (ProductCategoryProduct prodCatProd : prodCatProds) {
             prodIds.add(prodCatProd.ProductId);
         }
 
         String searchPattern = '%' + searchKey + '%';
 
         List<PricebookEntry> productList;
         if (String.isBlank(searchKey)) {
             productList = [
                 SELECT Id, Product2Id, Product2.Name, Product2.ProductCode, Product2.isWishlistItem_Quest__c, 
                        Product2.Family, Product2.QuantityUnitOfMeasure, Product2.SBQQ__PricingMethod__c, 
                        Product2.Description, UnitPrice, Pricebook2.Name, Product2.CurrencyIsoCode
                 FROM PricebookEntry
                 WHERE Pricebook2.Name = 'CI_Quest EStore Price Book' 
                   AND Product2Id IN :prodIds 
                   AND Product2.productClass != 'Variation'
                 ORDER BY Product2.Name
             ];
         } else {
             productList = [
                 SELECT Id, Product2Id, Product2.Name, Product2.ProductCode, Product2.isWishlistItem_Quest__c, 
                        Product2.Family, Product2.QuantityUnitOfMeasure, Product2.SBQQ__PricingMethod__c, 
                        Product2.Description, UnitPrice, Pricebook2.Name, Product2.CurrencyIsoCode
                 FROM PricebookEntry
                 WHERE Pricebook2.Name = 'CI_Quest EStore Price Book' 
                   AND Product2Id IN :prodIds 
                   AND Product2.productClass != 'Variation'
                   AND (Product2.Name LIKE :searchPattern 
                        OR Product2.ProductCode LIKE :searchPattern 
                        OR Product2.Family LIKE :searchPattern 
                        OR Product2.Description LIKE :searchPattern)
                 ORDER BY Product2.Name
             ];
         }
 
         System.debug('ProductList: ' + productList);
         return productList;
     }
 
 }