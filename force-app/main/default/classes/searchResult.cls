public with sharing class searchResult {
    @AuraEnabled(cacheable=true)
    public static List<Product2> getFilteredProducts(String searchKey) {
        System.debug('Entered getFilteredProducts with searchKey: ' + searchKey);

        if (String.isBlank(searchKey)) {
            System.debug('Search key is blank, returning an empty list.');
            return new List<Product2>();
        }

        String searchPattern = '%' + searchKey + '%';
        System.debug('Constructed search pattern: ' + searchPattern);

        // Query to fetch products and their related pricebook entries
        List<Product2> products = [
            SELECT Id, 
                   Name, 
                   ProductCode,
                   Description, 
                   Family, 
                   StockKeepingUnit,
                   ProductClass,
                   CurrencyIsoCode,
                   (SELECT UnitPrice FROM PricebookEntries WHERE IsActive = true AND Pricebook2.Name = 'CI_Quest EStore Price Book' LIMIT 1)
            FROM Product2
            WHERE (Name LIKE :searchPattern 
               OR ProductCode LIKE :searchPattern
               OR Family LIKE :searchPattern
               OR StockKeepingUnit LIKE :searchPattern
               OR Description LIKE :searchPattern)
            AND (ProductClass = 'VariationParent' OR ProductClass = 'Simple')
        ];

        System.debug('Query returned ' + products.size() + ' products.');

        // Add the unit price directly to the debug log
        for (Product2 product : products) {
            Decimal unitPrice = 0;
            if (!product.PricebookEntries.isEmpty()) {
                unitPrice = product.PricebookEntries[0].UnitPrice;
                System.debug('Product Name: ' + product.Name + ', Unit Price: ' + unitPrice);
            } else {
                System.debug('Product Name: ' + product.Name + ' has no active PricebookEntries in the Standard Price Book.');
            }
        }

        return products;
    }

    @AuraEnabled(cacheable=true)
    public static List<String> getProductFamilies() {
        System.debug('Fetching distinct product families.');

        List<String> families = new List<String>();

        // Query to fetch distinct Product Families
        List<AggregateResult> results = [
            SELECT Family
            FROM Product2
            WHERE Family != NULL
            GROUP BY Family
        ];

        for (AggregateResult result : results) {
            families.add((String) result.get('Family'));
        }

        System.debug('Fetched ' + families.size() + ' product families.');
        return families;
    }
}