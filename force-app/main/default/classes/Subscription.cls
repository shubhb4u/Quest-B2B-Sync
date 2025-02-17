public with sharing class Subscription {

    // Method to fetch Product Selling Models along with Product Name, Description, and SKU based on a single Product ID
    @AuraEnabled
    public static Map<String, Object> getProductSellingModelsByProductId(Id productId) {
        try {
            // Query the PricebookEntry for the given Product2Id
            List<PricebookEntry> pricebookEntries = [
                SELECT Id, Product2Id, ProductSellingModel.Name, ProductSellingModel.SellingModelType, CurrencyIsoCode, UnitPrice, ProductSellingModel.PricingTerm, Product2.Name, Product2.Description, Product2.StockKeepingUnit
                FROM PricebookEntry
                WHERE Product2Id = :productId 
                AND IsActive = true 
                AND Pricebook2Id = '01sO3000002QXGwIAO' // CI_Quest EStore Price Book ID
                And ProductSellingModel.Name != null
            ];

            // If no pricebook entries found, return empty data
            if (pricebookEntries.isEmpty()) {
                return new Map<String, Object>();
            }

            // Map to hold the product details and selling models
            Map<String, Object> result = new Map<String, Object>();
            
            // Get the product details from the first PricebookEntry (assuming there is at least one entry)
            Product2 product = pricebookEntries[0].Product2;
            result.put('productName', product.Name);
            result.put('productDescription', product.Description);
            result.put('productSKU', product.StockKeepingUnit);

            // Prepare selling models data
            List<Map<String, Object>> sellingModels = new List<Map<String, Object>>();
            for (PricebookEntry entry : pricebookEntries) {
                Map<String, Object> model = new Map<String, Object>();
                model.put('id', entry.Id);
                model.put('name', entry.ProductSellingModel.Name);
                model.put('type', entry.ProductSellingModel.SellingModelType);
                model.put('currencyIsoCode', entry.CurrencyIsoCode);
                model.put('unitPrice', entry.UnitPrice);
                sellingModels.add(model);
            }

            result.put('sellingModels', sellingModels);
            return result;
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching Product Selling Models: ' + e.getMessage());
        }
    }
    

    // Method to update the UnitPrice in the PricebookEntry if ProductSellingModel.Name is empty
    @AuraEnabled
    public static void updateProductSellingModel(Id productId, String sellingModel, Decimal newUnitPrice) {
        try {
            // Query the PricebookEntry record for the specific product and pricebook
            List<PricebookEntry> pricebookEntries = [
                SELECT Id, Product2Id, UnitPrice, ProductSellingModel.Name, Pricebook2Id
                FROM PricebookEntry
                WHERE Product2Id = :productId 
                AND Pricebook2Id = '01sO3000002QXGwIAO' // CI_Quest EStore Price Book ID
                LIMIT 1
            ];
            
            // Ensure that a PricebookEntry record is returned
            if (pricebookEntries.isEmpty()) {
                throw new AuraHandledException('No matching PricebookEntry found for the selected product and pricebook.');
            }

            PricebookEntry entry = pricebookEntries[0];

            // Check if ProductSellingModel.Name is empty
            if (String.isBlank(entry.ProductSellingModel.Name)) {
                // If the ProductSellingModel.Name is empty, update the UnitPrice
                entry.UnitPrice = newUnitPrice;
                update entry; // Update the PricebookEntry with the new UnitPrice
            } else {
                // If the ProductSellingModel.Name is not empty, no update is made
                throw new AuraHandledException('Product Selling Model is already set, Unit Price cannot be updated.');
            }

        } catch (Exception e) {
            throw new AuraHandledException('Error updating Unit Price in PricebookEntry: ' + e.getMessage());
        }
    }
    // Method to update the Selling_Model__c picklist field on the Product record
@AuraEnabled
public static void updateSellingModelPicklist(Id productId, String sellingModel) {
    try {
        // Query the Product2 record for the given productId
        Product2 product = [SELECT Id, Selling_Model__c FROM Product2 WHERE Id = :productId LIMIT 1];
        
        // Check if the Selling_Model__c picklist field is valid
        if (product != null) {
            // Set the picklist value based on the selected selling model
            if (sellingModel == 'Yearly' || sellingModel == 'Monthly') {
                product.Selling_Model__c = sellingModel;
                update product; // Update the Product2 record
            } else {
                throw new AuraHandledException('Invalid Selling Model. Only "Yearly" or "Monthly" are allowed.');
            }
        } else {
            throw new AuraHandledException('Product not found.');
        }
    } catch (Exception e) {
        throw new AuraHandledException('Error updating Selling Model picklist: ' + e.getMessage());
    }
}

}