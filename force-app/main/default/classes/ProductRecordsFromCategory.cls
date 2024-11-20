public without sharing class ProductRecordsFromCategory {

    @AuraEnabled(cacheable=true)
    public static List<PricebookEntry> getProductsFromCategory(String catId){
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
                SELECT Id, Product2Id, Product2.Name, Product2.ProductCode, Product2.Description,
                    UnitPrice, Pricebook2.Name
                FROM PricebookEntry
                WHERE Pricebook2.Name = 'CI_Quest EStore Price Book' and Product2Id in : prodIds
            ];

        System.debug('ProductList: ' + productList);
        return productList;
    }

}