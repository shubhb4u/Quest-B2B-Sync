public without sharing class FeaturedProductsController {

    @AuraEnabled(cacheable=true)
    public static List<PricebookEntry> getProductRecords(Id pricebookId) {

        return [
            SELECT
                Id,
                Product2Id,
                Pricebook2Id,
                UnitPrice,
                Pricebook2.Name,
                Product2.Name,
                Product2.ProductCode,
                Product2.Description,
                Product2.Featured_Product__c
            FROM
                PricebookEntry
            WHERE
            Pricebook2Id = :pricebookId
                AND Product2.Featured_Product__c = true
        ];
    }
    @AuraEnabled(cacheable=true)
    public static String getSiteBaseUrl() {
        // Use the Site class to get the base URL
        return Site.getBaseUrl();
    }
}