import { LightningElement, track, wire, api } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import PO_MESSAGE_CHANNEL from '@salesforce/messageChannel/poMessageChannel__c';

export default class TestLMS extends LightningElement {

    @track receivedPoNumber = '';
    storedPONumber;

    // Wire message context for Lightning Message Service
    @wire(MessageContext)
    messageContext;


    subscribeToMessageChannel() {
        subscribe(this.messageContext, PO_MESSAGE_CHANNEL, (message) => {
            this.handleMessage(message);
        });
    }

    handleMessage(message) {
        if (message.poNumber) {
            this.receivedPoNumber = message.poNumber;
            console.log('Received poNumber -->>> ' + this.receivedPoNumber);
        }
    }

}