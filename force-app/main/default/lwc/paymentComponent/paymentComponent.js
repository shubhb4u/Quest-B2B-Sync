import { LightningElement } from 'lwc';
import makeACHPayment from '@salesforce/apex/CyberSourceIntegration.makeACHPayment';

export default class PaymentComponent extends LightningElement {
    accountNumber = '';
    routingNumber = '';
    amount = 0;

    handleAccountChange(event) {
        this.accountNumber = event.target.value;
    }

    handleRoutingChange(event) {
        this.routingNumber = event.target.value;
    }

    handleAmountChange(event) {
        this.amount = event.target.value;
    }

    handlePayNow() {
        makeACHPayment({ accountNumber: this.accountNumber, routingNumber: this.routingNumber, amount: this.amount })
            .then(result => {
                console.log('Payment Successful:', result);
                // Handle success
            })
            .catch(error => {
                console.error('Payment Failed:', error);
                // Handle error
            });
    }
}