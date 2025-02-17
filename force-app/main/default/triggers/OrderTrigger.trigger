trigger OrderTrigger on Order (after insert, after update) {

    if(Trigger.isInsert || Trigger.isUpdate){
        if(Trigger.isAfter){
            OrderHandler.getOrderSummary(Trigger.new, Trigger.oldMap);
        }
    }
}