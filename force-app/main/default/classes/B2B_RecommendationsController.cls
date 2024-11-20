/**
 * @description recommendations products
 */
public without sharing class B2B_RecommendationsController {
  
  @AuraEnabled
  /**
   * @description retrieve recommendation products
   * @param input GetRecommendationsInput model
   * @return return string to json
   */
  public static String getRecommendations(GetRecommendationsInput input) {
    // Log the input object
    System.debug('Received input: ' + input);

    String orgDomain = Url.getOrgDomainUrl().toExternalForm();
    String endpoint =
      orgDomain +
      '/services/data/v57.0/commerce/webstores/' +
      input.webstoreId +
      '/ai/recommendations?language=en-US&asGuest=false&recommender=' +
      input.recommender;

    // Log the initial endpoint URL
    System.debug('Initial endpoint URL: ' + endpoint);

    if (String.isNotBlank(input.anchorValues)) {
      endpoint += '&anchorValues=' + input.anchorValues;
      // Log the updated endpoint if anchorValues are provided
      System.debug('Updated endpoint with anchorValues: ' + endpoint);
    }

    // Create HTTP request
    HttpRequest req = new HttpRequest();
    req.setEndpoint(endpoint);
    req.setHeader('Cookie', input.cookie);
    req.setMethod('GET');
    req.setHeader('Authorization', 'OAuth ' + UserInfo.getSessionId()); //NOPMD

    // Log request before sending
    System.debug('HTTP Request: ' + req);

    Http http = new Http();
    HTTPResponse res = http.send(req);

    // Log response details
    System.debug('HTTP Response: ' + res.getBody());

    return res.getBody();
  }

  /**
   * @description getRecommendations model class
   */
  public class GetRecommendationsInput {
    /**
     * @description WebStore Id
     */
    @AuraEnabled
    public String webstoreId { get; set; }

    // Log the value of webstoreId when it's set
  //  System.debug('webstoreId value: ' + webstoreId);

    /**
     * @description Recommender name
     */
    @AuraEnabled
    public String recommender { get; set; }

    // Log the value of recommender when it's set
  //  System.debug('recommender value: ' + recommender);

    /**
     * @description Anchor values
     */
    @AuraEnabled
    public String anchorValues { get; set; }

    // Log the value of anchorValues when it's set
  //  System.debug('anchorValues value: ' + anchorValues);

    /**
     * @description Cookie
     */
    @AuraEnabled
    public String cookie { get; set; }

    // Log the value of cookie when it's set
   // System.debug('cookie value: ' + cookie);
  }
}