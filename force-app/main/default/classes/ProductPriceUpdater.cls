public class ProductPriceUpdater {

    // Static variable to track if the updateProductPricing method has been executed in the current transaction
    private static Boolean isExecuted = false;

    // Method to update the Product2 Yearly or Monthly fields based on PricebookEntry records
    @InvocableMethod(label='Update Product Pricing' description='Updates the Product2 Yearly or Monthly field based on PricebookEntry records')
    public static void updateProductPricing(List<Id> productIds) {
        
        // Prevent recursion by checking the static variable
        if (isExecuted) {
            return;
        }

        // Mark as executed for the current transaction
        isExecuted = true;
        
        // Ensure that we are not processing an empty list
        if (productIds.isEmpty()) {
            return;
        }
        
        // Query PricebookEntry records for the given product IDs and specific Pricebook2Id
        List<PricebookEntry> pricebookEntries = [SELECT Id, Name, Product2Id, 
                                                         ProductSellingModel.Name, 
                                                         UnitPrice
                                                  FROM PricebookEntry 
                                                  WHERE Pricebook2Id = :'01sWG000000ISaYYAW'
                                                    AND Product2Id IN :productIds];

        // Map to collect Product2 records that need to be updated
        Map<Id, Product2> productsToUpdate = new Map<Id, Product2>();

        // Iterate through PricebookEntry records and determine how to update Product2 fields
        for (PricebookEntry entry : pricebookEntries) {
            if (entry.Product2Id != null) {
                // If the selling model is 'Yearly', update the Yearly__c field
                if (entry.ProductSellingModel != null && entry.ProductSellingModel.Name == 'Yearly') {
                    if (!productsToUpdate.containsKey(entry.Product2Id)) {
                        // Initialize Product2 if not already in map
                        productsToUpdate.put(entry.Product2Id, new Product2(Id = entry.Product2Id));
                    }
                    // Update Yearly field with the UnitPrice value
                    Product2 productToUpdate = productsToUpdate.get(entry.Product2Id);
                    productToUpdate.Yearly__c = entry.UnitPrice;
                    
                    // Debug log the Yearly__c value
                    System.debug('Setting Yearly__c for Product2 ' + entry.Product2Id + ' to ' + productToUpdate.Yearly__c);
                }
                // Otherwise, update the Monthly__c field
                else {
                    if (!productsToUpdate.containsKey(entry.Product2Id)) {
                        // Initialize Product2 if not already in map
                        productsToUpdate.put(entry.Product2Id, new Product2(Id = entry.Product2Id));
                    }
                    // Update Monthly field with the UnitPrice value
                    Product2 productToUpdate = productsToUpdate.get(entry.Product2Id);
                    productToUpdate.Monthly__c = entry.UnitPrice;
                    
                    // Debug log the Monthly__c value
                    System.debug('Setting Monthly__c for Product2 ' + entry.Product2Id + ' to ' + productToUpdate.Monthly__c);
                }
            }
        }

        // Check if there are Product2 records to update and perform the update in bulk
        if (!productsToUpdate.isEmpty()) {
            update productsToUpdate.values();  // Bulk update all Product2 records
            System.debug('Updated Product2 records: ' + productsToUpdate.keySet());
        }

        // Reset the flag at the end of the transaction (important if you're working with batch jobs or long-running processes)
        isExecuted = false;
    }
}