@RestResource(urlMapping='/webhook/*')
global with sharing class StripeWebHookHandler {

    @HttpPost
    global static void handleWebhook() {
        try {
            // Get the request body
            RestRequest req = RestContext.request;
            String payload = req.requestBody.toString();
            System.debug('Received payload: ' + payload);

        } catch (Exception e) {
            System.debug('Error handling Stripe Webhook: ' + e.getMessage());
            RestContext.response.statusCode = 500;
            RestContext.response.responseBody = Blob.valueOf('Error: ' + e.getMessage());
        }
    }

    
}