import { LightningElement, wire, track, api } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getProducts from '@salesforce/apex/StripePaymentHelper.getOpportunityLineItems';
import sendPaymentRequest from '@salesforce/apex/StripePaymentHelper.sendPaymentRequest';

export default class StripeProductListCmp extends LightningElement {
    error;
    records;
    totalPrice = 0;
    recordId;
    isProcess = false;
    isDisabled = false;

    @wire(CurrentPageReference)
 getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.recordId = currentPageReference.state.recordId;
            getProducts({ parentId: this.recordId })
                .then((result) => {
                    this.records = result;
                    console.log('records-->> '+ JSON.stringify(this.records));
                    this.totalPrice = 'Pay($' + result.reduce((sum, rec) => sum + rec.TotalPrice, 0) + ')';
                })
                .catch((error) => {
                    console.error('Error: ', error);
                });
        }
    }

    handlePay() {
        this.isProcess = true;
        this.isDisabled = true;
        const dataJson = JSON.stringify(this.records);
        console.log('dataJson -->> '+ dataJson);
        sendPaymentRequest({ productsJson: dataJson })
            .then((result) => {
                this.isProcess = false;
                this.showToast('Success', 'Payment request successfully sent', 'success');
            })
            .catch((error) => {
                this.isProcess = false;
                this.isDisabled = false;
                this.showToast('Error', 'Something went wrong: ' + error, 'error');
            });
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: 'dismissable'
        });
        this.dispatchEvent(evt);
    }
}