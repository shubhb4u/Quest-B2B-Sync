/**
 * @description       : 
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 11-20-2024
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public without sharing class AddWishList {

    @AuraEnabled
    public static WishListItem addWishListItem(String storeId, String productId, String accountId) {
        WishListItem responseMessage;
		system.debug('storeId ==>' +storeId);
        system.debug('productId ==>' +productId);
        system.debug('accountId ==>' +accountId);
        // Fetch the storeId from the custom label
        // storeId = Label.WebstoreId;

        try {
            // Validate input parameters
            if (String.isEmpty(accountId) || String.isEmpty(storeId) || String.isEmpty(productId)) {
                return null;
            }

            // Query the product matching the provided product ID
            Product2 product = [SELECT Id, Name FROM Product2 WHERE Id = :productId LIMIT 1];
            System.debug('Fetched product: ' + product);

            // Query the existing wishlist for the given AccountId and WebStoreId
            List<Wishlist> wishList = [SELECT Id, AccountId, WebStoreId 
                                       FROM Wishlist 
                                       WHERE AccountId = :accountId AND WebStoreId = :storeId 
                                       LIMIT 1];

            WishListItem newItem;

            // If a wishlist already exists
            if (!wishList.isEmpty()) {
                Wishlist existingWishList = wishList[0];

                // Add the item to the existing wishlist
                newItem = new WishListItem();
                newItem.Name = 'Item for ' + productId;  // Customizable name
                newItem.Product2Id = product.Id;  // Use the product ID
                newItem.WishlistId = existingWishList.Id;

            } else {
                // If no wishlist exists, create a new one
                Wishlist newWishList = new Wishlist();
                newWishList.AccountId = accountId;
                newWishList.WebStoreId = storeId;
                newWishList.Name = 'Sample WishList';
                insert newWishList;

                // Add the item to the new wishlist
                newItem = new WishListItem();
                newItem.Name = product.Name;  // Customizable name
                newItem.Product2Id = product.Id;  // Use the product ID
                newItem.WishlistId = newWishList.Id;
            }

            // Insert the wishlist item
            insert newItem;
            responseMessage = newItem;
            System.debug('responseMessage --->>> ' + responseMessage);

        } catch (Exception ex) {
            System.debug('Error creating wishListItem --->>: ' + ex.getMessage());
        }

        return responseMessage;
    }

    @AuraEnabled(cacheable=true)
    public static List<Product2> getAllProducts() {
        // Query all products without any filters (fetches all products in Salesforce)
        List<Product2> productList = [SELECT Id, Name, ProductCode FROM Product2];

        return productList;
    }

    @AuraEnabled(cacheable=true)
    public static String getSiteBaseUrl() {
        // Use the Site class to get the base URL
        return Site.getBaseUrl();
    }
}