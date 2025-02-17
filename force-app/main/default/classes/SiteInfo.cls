public with sharing class SiteInfo {

    @AuraEnabled(cacheable=true)
    public static String getSiteBaseUrl() {
        // Use the Site class to get the base URL
        return Site.getBaseUrl();
    }
}