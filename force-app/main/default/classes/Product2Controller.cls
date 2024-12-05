public without sharing class Product2Controller {

    @AuraEnabled(cacheable=true)
    public static List<Product2> getProductsByCode(
        String productSKU1,
        String productSKU2,
        String productSKU3,
        String productSKU4
    ) {
        try {

            List<String> productSKUs = new List<String>{};
            if (productSKU1 != null) {
                productSKUs.add(productSKU1);
            }
            if (productSKU2 != null) {
                productSKUs.add(productSKU2);
            }
            if (productSKU3 != null) {
                productSKUs.add(productSKU3);
            }
            if (productSKU4 != null) {
                productSKUs.add(productSKU4);
            }
            List<Product2> products = [SELECT Id, Name, StockKeepingUnit, Description, Content_Type__c, Award_Image_ID__c FROM Product2 WHERE StockKeepingUnit IN :productSKUs];

            return products;
        } catch (Exception e) {
            System.debug('Error in apex class: ' + e.getMessage() + ' ' + e.getLineNumber() + ' ' + e.getCause());
            System.debug('Stack trace: ' + e.getStackTraceString());
            throw e;
        }
    }


    @AuraEnabled(cacheable=true)
    public static String getProfileName() {
        return [SELECT Profile.Name FROM User WHERE Id = :UserInfo.getUserId()].Profile.Name;
    }
}