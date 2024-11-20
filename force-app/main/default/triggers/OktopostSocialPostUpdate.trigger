trigger OktopostSocialPostUpdate on Oktopost_Social_Post__c (before insert, before update) {
  
    Map<String, Id> OktopostCampaignIdMap = new Map<String, Id>();
    Map<String, Id> OktopostUserIdMap = new Map<String, Id>();
    
    List<String> OktopostCampaignIds = new List<String>();
    List<String> OktopostUserIds = new List<String>();
        
    for (Oktopost_Social_Post__c post : trigger.new) {
        if (post.Campaign_Id__c != null) {
            OktopostCampaignIds.add(post.Campaign_Id__c);
        }
        if (post.User_Id__c != null) {
            OktopostUserIds.add(post.User_Id__c);
        }
    }
    
    List<Oktopost_User__c> userObjs = [SELECT User_Id__c, Id FROM Oktopost_User__c WHERE User_Id__c IN :OktopostUserIds];
    for (Oktopost_User__c userObj : userObjs) {
        OktopostUserIdMap.put(userObj.User_Id__c, userObj.Id);
    }
   
    List<Oktopost_Campaign__c> campaignObjs = [SELECT Campaign_Id__c, Id FROM Oktopost_Campaign__c WHERE Campaign_Id__c IN :OktopostCampaignIds];
    for (Oktopost_Campaign__c campaignObj : campaignObjs) {
        OktopostCampaignIdMap.put(campaignObj.Campaign_Id__c, campaignObj.Id);
    }
        
    for (Oktopost_Social_Post__c post : trigger.new) {
        if (post.Campaign_Id__c != null && OktopostCampaignIdMap.containsKey(post.Campaign_Id__c)) {
            post.Oktopost_Campaign_Id__c = OktopostCampaignIdMap.get(post.Campaign_Id__c);

        }
        if (post.User_Id__c != null && OktopostUserIdMap.containsKey(post.User_Id__c)) {
            post.Oktopost_User_Id__c = OktopostUserIdMap.get(post.User_Id__c);
        }
    }
}