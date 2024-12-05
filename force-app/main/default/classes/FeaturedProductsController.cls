/**
 * @description       : 
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 12-05-2024
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
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
                AND Product2.Featured_Product__c = true limit 4
        ];
    }
}