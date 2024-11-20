public without sharing class ProductTile {
   
    @AuraEnabled(cacheable=true)
    public static List<PricebookEntry> getProductRecs( ) {
        List<PricebookEntry> productList = [
                SELECT Id, Product2Id, Product2.Name, Product2.isWishlistItem_Quest__c, Product2.Family, Product2.QuantityUnitOfMeasure, Product2.SBQQ__PricingMethod__c, Product2.ProductCode, Product2.Description,
                    UnitPrice, Pricebook2.Name
                FROM PricebookEntry
                WHERE Pricebook2.Name = 'CI_Quest EStore Price Book' ORDER BY Product2.Name
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
                SELECT Id, Product2Id, Product2.Name, Product2.ProductCode, Product2.isWishlistItem_Quest__c, Product2.Family, Product2.QuantityUnitOfMeasure, Product2.SBQQ__PricingMethod__c, Product2.Description,
                    UnitPrice, Pricebook2.Name
                FROM PricebookEntry
                WHERE Pricebook2.Name = 'CI_Quest EStore Price Book' and Product2Id in : prodIds ORDER BY Product2.Name
                // LIMIT :pageSize OFFSET :offset
            ];

        System.debug('ProductList: ' + productList);
        return productList; 
    }




    // Need to check later the issue with this class ---------------------------------------------- Shubham
    // @AuraEnabled
    // public static ConnectApi.Wishlist createAndAddToList(
    //     String storeId,
    //     String productId,
    //     String wishlistName,
    //     String effectiveAccountId
    // ) {

    //     // Store the product in a WishlistItemInput to pass to the Wishlist
    //     ConnectApi.WishlistItemInput wishlistItemInput = new ConnectApi.WishlistItemInput();
    //     wishlistItemInput.productId = productId;

    //     //Create a wishlistInput to be created
    //     ConnectApi.WishlistInput wishlistInput = new ConnectApi.WishlistInput();
    //     wishlistInput.name = wishlistName;
    //     wishlistInput.products = new List<ConnectApi.WishlistItemInput>{
    //     wishlistItemInput
    //     };

    //     // https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_ConnectAPI_CommerceWishlist_static_methods.htm#apex_ConnectAPI_CommerceWishlist_static_methods
    //     return ConnectApi.CommerceWishlist.createWishlist(
    //     storeId,
    //     effectiveAccountId,
    //     wishlistInput
    //     );
    // }

}