public without sharing class Product2Controller {

    @AuraEnabled(cacheable=true)
    public static List<Product2> getProductsByCode(
        String productcode,
        String  productcode2,
        String productcode3,
        String productcode4
    ) {
        try {

            List<String> productCodes = new List<String>{};
            if (productcode != null) {
                productCodes.add(productcode);
            }
            if (productcode2 != null) {
                productCodes.add(productcode2);
            }
            if (productcode3 != null) {
                productCodes.add(productcode3);
            }
            if (productcode4 != null) {
                productCodes.add(productcode4);
            }
            List<Product2> products = [SELECT Id, Name, ProductCode, Description, Content_Type__c, Award_Image_ID__c FROM Product2 WHERE ProductCode IN :productCodes];

            return products;
        } catch (Exception e) {
            System.debug('Error in apex class: ' + e.getMessage() + ' ' + e.getLineNumber() + ' ' + e.getCause());
            System.debug('Stack trace: ' + e.getStackTraceString());
            throw e;
        }
    }
}