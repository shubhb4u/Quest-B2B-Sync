@isTest
public class OktopostTestTriggerSocialPostUpdate {

    static testMethod void test() {
        Oktopost_User__c user = new Oktopost_User__c(
            Name = 'John Doe',
            Email__c = 'john@doe.com',
            First_Name__c = 'John',
            Last_Name__c = 'Doe',
            Status__c = 'active',
            User_Id__c = 'AAA1234567'
        );
        insert user;
        
        Oktopost_Campaign__c campaign = new Oktopost_Campaign__c(
            Campaign_Id__c = 'BBB1234567'
        );
        insert campaign;
        
        Oktopost_Social_Post__c post = new Oktopost_Social_Post__c(
        	Campaign_Id__c = 'BBB1234567',
            User_Id__c = 'AAA1234567',
            Date__c = System.Date.today(), 
            StartDateTime__c = System.DateTime.now(), 
            Network__c = 'Twitter'
        );
        insert post;
        
        post = [SELECT Oktopost_Campaign_Id__c, Oktopost_User_Id__c FROM Oktopost_Social_Post__c WHERE Id = :post.Id];
        System.assertEquals(campaign.Id, post.Oktopost_Campaign_Id__c);
        System.assertEquals(user.Id, post.Oktopost_User_Id__c);
    }
}