public without sharing class ProductTile {
   
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getProductRecs(Integer pageSize, String lastRecordId) {
        String query = 'SELECT Id, Product2Id, Product2.Name, Product2.isWishlistItem_Quest__c, Product2.Family, Product2.QuantityUnitOfMeasure, Product2.SBQQ__PricingMethod__c, '
                    + 'Product2.ProductCode, Product2.Description, UnitPrice, Pricebook2.Name '
                    + 'FROM PricebookEntry WHERE Pricebook2.Name = \'CI_Quest EStore Price Book\' ';
                    
        if (String.isNotBlank(lastRecordId)) {
            query += 'AND Id > :lastRecordId ';
        }
        query += 'ORDER BY Id LIMIT :pageSize';

        // Fetch the products
        List<PricebookEntry> products = Database.query(query);

        // Get the total record count
        String countQuery = 'SELECT COUNT() FROM PricebookEntry WHERE Pricebook2.Name = \'CI_Quest EStore Price Book\'';
        Integer totalRecords = Database.countQuery(countQuery);

        // Return products and total record count
        return new Map<String, Object>{
            'products' => products,
            'totalRecords' => totalRecords
        };
    




        // List<PricebookEntry> productList = [
        //         SELECT Id, Product2Id, Product2.Name, Product2.isWishlistItem_Quest__c, Product2.Family, Product2.QuantityUnitOfMeasure, Product2.SBQQ__PricingMethod__c, Product2.ProductCode, Product2.Description,
        //             UnitPrice, Pricebook2.Name
        //         FROM PricebookEntry
        //         WHERE Pricebook2.Name = 'CI_Quest EStore Price Book'
        //         // LIMIT :pageSize OFFSET :offset
        //     ];

        // System.debug('ProductList: ' + productList);
        // return productList;
    } 

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getProdId(String catId, Integer pageSize, String lastRecordId) {
        System.debug('ProductCategory Id: ' + catId);
    
        // Fetch Product IDs related to the given Product Category
        List<ProductCategoryProduct> prodCatProds = [
            SELECT ProductId, ProductCategoryId 
            FROM ProductCategoryProduct 
            WHERE ProductCategoryId = :catId
        ];
        System.debug('prodCatProds: ' + prodCatProds);
    
        List<Id> prodIds = new List<Id>();
        for (ProductCategoryProduct prodCatProd : prodCatProds) {
            prodIds.add(prodCatProd.ProductId);
        }
    
        // Check if prodIds is empty to avoid SOQL errors
        if (prodIds.isEmpty()) {
            return new Map<String, Object>{
                'products' => new List<PricebookEntry>(),  // Return an empty list if no products are found
                'totalRecords' => 0
            };
        }
    
        // Build the query for fetching the products
        String query = 'SELECT Id, Product2Id, Product2.Name, Product2.isWishlistItem_Quest__c, Product2.Family, Product2.QuantityUnitOfMeasure, Product2.SBQQ__PricingMethod__c, '
                     + 'Product2.ProductCode, Product2.Description, UnitPrice, Pricebook2.Name '
                     + 'FROM PricebookEntry WHERE Pricebook2.Name = \'CI_Quest EStore Price Book\' ';
    
        // Add conditions for lastRecordId and prodIds
        if (String.isNotBlank(lastRecordId)) {
            query += 'AND Id > :lastRecordId ';
        }
        query += 'AND Product2Id IN :prodIds ';
    
        // Add ORDER BY and LIMIT
        query += 'ORDER BY Id LIMIT :pageSize';
    
        // Fetch the products
        List<PricebookEntry> products = Database.query(query);
    
        // Get the total count of records for the provided category
        String countQuery = 'SELECT COUNT() FROM PricebookEntry WHERE Pricebook2.Name = \'CI_Quest EStore Price Book\' '
                          + 'AND Product2Id IN :prodIds';
        Integer totalRecords = Database.countQuery(countQuery);
    
        // Return both the products and total record count in a map
        return new Map<String, Object>{
            'products' => products,
            'totalRecords' => totalRecords
        };
    }
    


}