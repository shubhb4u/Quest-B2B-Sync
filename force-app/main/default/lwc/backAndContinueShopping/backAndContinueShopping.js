import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class BackAndContinueShopping extends NavigationMixin(LightningElement) {
    // Navigate to the previous page
    handleBack() {
        window.history.back();
    }

    // Navigate to the home page
    handleContinueShopping() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/'
            }
        });
    }
}