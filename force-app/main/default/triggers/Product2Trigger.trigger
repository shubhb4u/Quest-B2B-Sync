trigger Product2Trigger on Product2 (after insert, after update) {
    
    // List to store Product2 IDs that need to be processed
    List<Id> productIdsToProcess = new List<Id>();

    // Loop through the inserted or updated Product2 records
    for (Product2 product : Trigger.new) {
        
        // Only process records where either Yearly__c or Monthly__c is empty (null or 0.0)
        if (product.Yearly__c == null || product.Yearly__c == 0.0 || 
            product.Monthly__c == null || product.Monthly__c == 0.0) {
            productIdsToProcess.add(product.Id);
        }
    }

    // If there are Product2 records that need to be processed, call the updater
    if (!productIdsToProcess.isEmpty()) {
        ProductPriceUpdater.updateProductPricing(productIdsToProcess);
    }
}