public without sharing class ProductTile {
   
    @AuraEnabled(cacheable=true)
    public static List<PricebookEntry> getProductRecs( ) {
        List<PricebookEntry> productList = [
                SELECT Id, Product2Id, Product2.Name,  Product2.isWishlistItem_Quest__c, Product2.Family, Product2.QuantityUnitOfMeasure, Product2.SBQQ__PricingMethod__c, Product2.ProductCode, Product2.Description,
                    UnitPrice, Pricebook2.Name
                FROM PricebookEntry
                WHERE Pricebook2.Name = 'CI_Quest EStore Price Book' and Product2.productClass != 'Variation'  ORDER BY Product2.Name
                // LIMIT :pageSize OFFSET :offset
            ];

        System.debug('ProductList: ' + productList);
        return productList;
    } 

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
                    UnitPrice, Pricebook2.Name
                FROM PricebookEntry
                WHERE Pricebook2.Name = 'CI_Quest EStore Price Book' and Product2Id in : prodIds and Product2.productClass != 'Variation'  ORDER BY Product2.Name
                // LIMIT :pageSize OFFSET :offset
            ];

        System.debug('ProductList: ' + productList);
        return productList; 
    }

    @AuraEnabled(cacheable=true)
    public static String getCategoryName(String catId) {

        if (String.isBlank(catId)) {
            return null;
        }

        ProductCategory category = [
            SELECT Name 
            FROM ProductCategory 
            WHERE Id = :catId
            LIMIT 1
        ];

        return category != null ? category.Name : null;
    }

}