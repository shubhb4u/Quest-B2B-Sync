public without sharing class OrderHandler {

    public static void getOrderSummary(List<order> orderList, Map<id, order> oldmap) {

        
        Set<String> Ordernumbers = new Set<String>();
        if(!orderList.isEmpty()){
            for(Order ordNum: orderList){
                if(ordNum.OrderReferenceNumber != null && oldMap.get(ordNum.Id).OrderReferenceNumber == null){
                    Ordernumbers.add(ordNum.OrderReferenceNumber);
                    System.debug('ordNum.OrderReferenceNumber -->> '+ ordNum.OrderReferenceNumber);
                }
            }
        }

        if(!Ordernumbers.isEmpty()){

            Map<Id, orderSummary> orderSummarymap = new map<Id, OrderSummary>([SELECT Id, Payment_type__c, (SELECT Id, Type, OrderSummaryId FROM OrderPaymentSummaries) 
            FROM OrderSummary WHERE OrderNumber =: 'UL5IB-Q7DIV-KDGOD-ME4E5'
           ]);
            System.debug('orderSummarymap -->> '+ orderSummarymap);
            List<orderPaymentSummary> updateOrderPaySumm = new List<orderPaymentSummary>();
            List<orderSummary> updateOrderSumm = new List<orderSummary>();

            if(!orderSummarymap.isEmpty()){
                for (OrderSummary ordSummary : orderSummarymap.values()) {
                    ordSummary.Payment_type__c = 'Credit Card';
                    updateOrderSumm.add(ordSummary);
                    for (OrderPaymentSummary ordPay : ordSummary.orderPaymentSummaries) {
                        if (orderSummarymap.containsKey(ordPay.OrderSummaryId)) {
                            ordPay.Type = orderSummarymap.get(ordPay.OrderSummaryId).Payment_type__c;
                            updateOrderPaySumm.add(ordPay);
                        }
                    }
                }
                
            }
            System.debug('updateOrderPaySumm -->> '+ updateOrderPaySumm);

            if(!updateOrderSumm.isEmpty()){
                update updateOrderSumm;
            }

            if(!updateOrderPaySumm.isEmpty()){
                update updateOrderPaySumm;
            }

        }

    }
}