public class CyberSourceIntegration {
    private static final String ENDPOINT = 'https://apitest.cybersource.com/pts/v2/payments'; // Named Credential

    public class ACHPaymentRequest {
        public Map<String, Object> clientReferenceInformation { get; set; }
        public Map<String, Object> paymentInformation { get; set; }
        public Map<String, Object> orderInformation { get; set; }
    }

    public class ACHPaymentResponse {
        public String id { get; set; }
        public String status { get; set; }
    }

    @AuraEnabled
    public static ACHPaymentResponse makeACHPayment(String accountNumber, String routingNumber, Decimal amount) {
        try {

            accountNumber = '4100';
            routingNumber = '071923284';
            amount = 100;
            // Construct the JSON request body
            Map<String, Object> requestBody = new Map<String, Object>{
                'clientReferenceInformation' => new Map<String, Object>{'code' => 'TC50171_3'},
                'paymentInformation' => new Map<String, Object>{
                    'bank' => new Map<String, Object>{
                        'account' => new Map<String, Object>{
                            'type' => 'C', // Checking
                            'number' => accountNumber
                        },
                        'routingNumber' => routingNumber
                    },
                    'paymentType' => new Map<String, Object>{'name' => 'CHECK'}
                },
                'orderInformation' => new Map<String, Object>{
                    'amountDetails' => new Map<String, Object>{
                        'totalAmount' => amount.toPlainString(),
                        'currency' => 'USD'
                    },
                    'billTo' => new Map<String, Object>{
                        'firstName' => 'John',
                        'lastName' => 'Doe',
                        'address1' => '1 Market St',
                        'locality' => 'san francisco',
                        'administrativeArea' => 'CA',
                        'postalCode' => '94105',
                        'country' => 'US',
                        'email' => 'test@cybs.com',
                        'phoneNumber' => '4696743184'
                    }
                }
            };

            // Create and send the HTTP request
            HttpRequest req = new HttpRequest();
            req.setEndpoint(ENDPOINT);
            req.setMethod('POST');
            req.setHeader('Content-Type', 'application/json');
            req.setBody(JSON.serialize(requestBody));

            System.debug('Request Payload: ' + JSON.serialize(requestBody));

            HttpResponse res = new Http().send(req);

            System.debug('Response Body: ' + res.getBody());
            System.debug('Response Headers: ' + res.getHeaderKeys());

            // Check response
            if (res.getStatusCode() == 201 || res.getStatusCode() == 200) {
                return (ACHPaymentResponse) JSON.deserialize(res.getBody(), ACHPaymentResponse.class);
            } else {
                throw new CalloutException('Payment failed: ' + res.getBody());
            }
        } catch (Exception e) {
            throw new AuraHandledException('Payment exception: ' + e.getMessage());
        }
    }
}