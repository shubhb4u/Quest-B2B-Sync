import { LightningElement, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getPricebookEntry from '@salesforce/apex/SubscriptionProduct.getPricebookEntry';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ProductSellingModel extends LightningElement {
    currentProductId; // Store the productId
    sellingModelOptions = [];
    selectedSellingModel = '';
    productSellingModel = [];

    // Wire the CurrentPageReference to get the current page context and productId
    @wire(CurrentPageReference)
    getPageReference(pageReference) {
        if (pageReference) {
            const urlPath = pageReference.attributes.recordId; // Fetch product ID from URL
            
            if (urlPath) {
                this.currentProductId = urlPath; // Store product ID for future use

                // Fetch product selling model details after the productId is available
                this.fetchProductSellingModel(urlPath);
            }
        }
    }

    // Fetch the product selling model using the productId
    fetchProductSellingModel(productId) {
        getPricebookEntry({ productId: productId }) // Ensure correct method name here
            .then(result => {
                this.sellingModelOptions = [];
                this.productSellingModel = result; // Store fetched product selling model details
    
                // Populate selling model options (picklist)
                if (result && result.length > 0) {
                    this.sellingModelOptions = result.map(model => {
                        return {
                            label: model.Name,
                            value: model.Id
                        };
                    });
                }
            })
            .catch(error => {
                this.showErrorToast(error.body.message);
            });
    }
    

    // Handle change in selected selling model
    handleSellingModelChange(event) {
        this.selectedSellingModel = event.target.value;
    }

    // Show error message
    showErrorToast(message) {
        const event = new ShowToastEvent({
            title: 'Error',
            message: message,
            variant: 'error',
        });
        this.dispatchEvent(event);
    }
}