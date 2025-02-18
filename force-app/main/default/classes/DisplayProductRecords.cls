/**
 * @description       : Updated by Shubham to limit records to 8 for performance reasons. Looking for long-term solutions.
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 09-08-2024
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public without sharing class DisplayProductRecords {

    @AuraEnabled(cacheable=true)
    public static List<Product2> getProdId(String catId){
        System.debug('ProductCategory Id: ' +catId);

        List<ProductCategoryProduct> prodCatProds = [SELECT ProductId,ProductCategoryId 
                                                    FROM ProductCategoryProduct 
                                                    WHERE ProductCategoryId = :catId];
        System.debug('prodCatProds: ' +prodCatProds);
        List<Id> prodIds = new List<Id>();
        for(ProductCategoryProduct prodCatProd : prodCatProds){
            prodIds.add(prodCatProd.ProductId);
        }
        List<Product2> prods = [SELECT Id, Name,ProductCode, Description FROM Product2 WHERE Id =: prodIds];

        System.debug('Product Category with products: ' +prods); 
        return prods; 
    }

}