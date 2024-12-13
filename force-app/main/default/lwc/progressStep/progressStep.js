import { LightningElement, api } from 'lwc';

export default class progressStep extends LightningElement {
    @api currentStep = 1; // The current progress step (1, 2, or 3)

    // Compute the classes for step 2
    get stepTwoClass() {
        return this.currentStep >= 2 ? 'active' : '';
    }

    // Compute the classes for step 3
    get stepThreeClass() {
        return this.currentStep >= 3 ? 'active' : '';
    }
}