/**
 * @description       : Handles adding/removing items from the wishlist.
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 11-20-2024
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public without sharing class AddWishList {

    @AuraEnabled
    public static String addWishListItem(String storeId, String productId, String accountId, Boolean isAdded) {
        // Validate input parameters
        if (String.isEmpty(accountId) || String.isEmpty(storeId) || String.isEmpty(productId)) {
            return 'Error: AccountId, StoreId, and ProductId are required.';
        }

        try {
            // Query the product matching the provided product ID
            Product2 product = [SELECT Id, Name, isWishlistItem_Quest__c FROM Product2 WHERE Id = :productId LIMIT 1];

            // Query the existing wishlist for the given AccountId and WebStoreId
            Wishlist existingWishList = [SELECT Id FROM Wishlist WHERE AccountId = :accountId AND WebStoreId = :storeId LIMIT 1];

            if (isAdded) {
                // Adding item to wishlist
                return handleAddToWishlist(product, existingWishList, storeId, accountId);
            } else {
                // Removing item from wishlist
                return handleRemoveFromWishlist(productId, existingWishList);
            }

        } catch (Exception ex) {
            // Log the exception and return a handled error
            System.debug('Error in addWishListItem: ' + ex.getMessage());
            return 'Error: An unexpected error occurred while processing your request.';
        }
    }

    private static String handleAddToWishlist(Product2 product, Wishlist existingWishList, String storeId, String accountId) {
        WishListItem newItem;

        try {
            // If a wishlist exists
            if (existingWishList != null) {
                newItem = new WishListItem(
                    Name = 'Item for ' + product.Name,
                    Product2Id = product.Id,
                    WishlistId = existingWishList.Id
                );
            } else {
                // Create a new wishlist and add the item
                Wishlist newWishList = new Wishlist(
                    AccountId = accountId,
                    WebStoreId = storeId,
                    Name = 'Sample WishList'
                );
                insert newWishList;

                newItem = new WishListItem(
                    Name = 'Item for ' + product.Name,
                    Product2Id = product.Id,
                    WishlistId = newWishList.Id
                );
            }

            product.isWishlistItem_Quest__c = true;
            update product;

            insert newItem;
            System.debug('Item added to wishlist: ' + newItem);
            return 'added';
            
        } catch (Exception ex) {
            System.debug('Error in handleAddToWishlist: ' + ex.getMessage());
            return 'Error: Failed to add the item to the wishlist.';
        }
    }

    private static String handleRemoveFromWishlist(String productId, Wishlist existingWishList) {
        try {
            if (existingWishList == null) {
                return 'Error: No existing wishlist found for the given account and store.';
            }

            Product2 product = [SELECT Id, Name, isWishlistItem_Quest__c FROM Product2 WHERE Id = :productId LIMIT 1];

            // Find the wishlist item to delete
            WishListItem itemToRemove = [SELECT Id FROM WishListItem WHERE Product2Id = :productId AND WishlistId = :existingWishList.Id LIMIT 1];

            if (itemToRemove != null) {
                delete itemToRemove;
                product.isWishlistItem_Quest__c = false;
                update product;

                System.debug('Item removed from wishlist: ' + itemToRemove.Id);
                return 'removed';
            } else {
                return 'Error: Wishlist item not found.';
            }
        } catch (Exception ex) {
            System.debug('Error in handleRemoveFromWishlist: ' + ex.getMessage());
            return 'Error: Failed to remove the item from the wishlist.';
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Product2> getAllProducts() {
        // Query all products
        return [SELECT Id, Name, ProductCode FROM Product2];
    }

    @AuraEnabled(cacheable=true)
    public static String getSiteBaseUrl() {
        // Get the base URL of the site
        return Site.getBaseUrl();
    }
}
