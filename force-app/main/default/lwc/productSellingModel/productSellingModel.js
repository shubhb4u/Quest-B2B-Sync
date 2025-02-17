import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getProductSellingModels from '@salesforce/apex/Subscription.getProductSellingModelsByProductId';
import updateProductSellingModel from '@salesforce/apex/Subscription.updateProductSellingModel';
import updateSellingModelPicklist from '@salesforce/apex/Subscription.updateSellingModelPicklist'; // New method to update Selling_Model__c
import { addItemToCart } from 'commerce/cartApi'; // Assuming this is part of the commerce API

export default class ProductSellingModel extends LightningElement {
    @track sellingModels = []; // Array to store the fetched selling models
    selectedPricingTerm = ''; // Selected pricing term by the user
    selectedModel; // To store selected model details based on pricing term
    pricingTermOptions = []; // To store the dropdown options for pricing terms
    productId; // To store the productId from URL
    @track quantity = 1; // Default quantity

    // Product details
    productName = '';
    productDescription = '';
    productSKU = '';

    // Wire the page reference to get the product ID from the URL
    @wire(CurrentPageReference)
    getPageReference(pageReference) {
        if (pageReference) {
            this.productId = pageReference.attributes.recordId; // Get productId from URL
            if (this.productId) {
                this.fetchProductSellingModels(this.productId); // Fetch selling models once productId is available
            }
        }
    }

    // Fetch the product selling models and product details from the Apex controller
    fetchProductSellingModels(productId) {
        getProductSellingModels({ productId })
            .then((data) => {
                if (data && data.sellingModels && data.sellingModels.length > 0) {
                    this.sellingModels = data.sellingModels.map((model) => ({
                        id: model.id,
                        name: model.name,
                        type: model.type,
                        currencyIsoCode: model.currencyIsoCode,
                        unitPrice: model.unitPrice,
                    }));

                    // Create dropdown options for pricing terms
                    this.pricingTermOptions = this.sellingModels.map((model) => ({
                        label: model.name,
                        value: model.name,
                    }));

                    // Set product details
                    this.productName = data.productName;
                    this.productDescription = data.productDescription;
                    this.productSKU = data.productSKU;

                    // Set default pricing term to "Yearly" if available
                    const yearlyOption = this.sellingModels.find(model => model.name.toLowerCase() === 'yearly');
                    if (yearlyOption) {
                        this.selectedModel = yearlyOption;  // Select the Yearly model
                        this.selectedPricingTerm = yearlyOption.name; // Set the dropdown value
                        this.submitSelectedModel(yearlyOption); // Automatically trigger the update
                    } else if (this.sellingModels.length === 1) {
                        // If "Yearly" is not found, select the first available pricing term
                        this.selectedModel = this.sellingModels[0];
                        this.selectedPricingTerm = this.selectedModel.name;
                        this.submitSelectedModel(this.selectedModel); // Automatically trigger the update
                    }
                } else {
                    this.sellingModels = []; // Set to empty if no data found
                }
            })
            .catch((error) => {
                this.showToast('Error', 'Failed to fetch selling models.', 'error');
            });
    }

    // Method to handle when the user selects a pricing term
    handlePricingTermChange(event) {
        const selectedTerm = event.detail.value;
        this.selectedPricingTerm = selectedTerm;
        this.selectedModel = this.sellingModels.find((model) => model.name === selectedTerm) || null;

        // Automatically update the price when a model is selected
        if (this.selectedModel) {
            this.submitSelectedModel(this.selectedModel);
        }
    }

    // Method to handle the update action to update the Selling Model in PricebookEntry
    submitSelectedModel(selectedModel) {
        if (!selectedModel) {
            this.showToast('Error', 'Please select a pricing term before submitting.', 'error');
            return;
        }

        const { unitPrice, name } = selectedModel;

        updateProductSellingModel({ productId: this.productId, sellingModel: name, newUnitPrice: unitPrice })
            .then(() => {
                this.showToast('Success', 'Product price updated successfully!', 'success');
            })
            .catch(() => {
                this.showToast('Error', 'Failed to update the selling model.', 'error');
            });
    }

    // Method to handle quantity change
    handleQuantityChange(event) {
        const newQuantity = parseInt(event.target.value, 10);
        if (newQuantity >= 1) {
            this.quantity = newQuantity; // Update the selected quantity
        }
    }

    // Method to handle adding the product to the cart
    handleAddToCart(event) {
        if (this.selectedModel) {
            addItemToCart(this.productId, this.quantity)
                .then(() => {
                    this.showToast('Success', 'Product was added to the cart.', 'success');

                    // After adding the item to the cart, update the Selling_Model__c field on Product2
                    const sellingModel = this.selectedModel.name.toLowerCase();
                    if (sellingModel === 'yearly' || sellingModel === 'monthly') {
                        updateSellingModelPicklist({ productId: this.productId, sellingModel: sellingModel })
                            .then(() => {
                                this.showToast('Success', `Selling model updated to ${sellingModel}.`, 'success');
                            })
                            .catch((error) => {
                                this.showToast('Error', `Failed to update Selling Model: ${error.body.message}`, 'error');
                            });
                    }
                })
                .catch(() => {
                    this.showToast('Error', 'Failed to add product to cart.', 'error');
                });
        } else {
            this.showToast('Error', 'Please select a pricing term before adding to cart.', 'error');
        }
    }

    // Method to display toast notifications
    showToast(title, message, variant) {
        const evt = new ShowToastEvent({ title, message, variant });
        this.dispatchEvent(evt);
    }

    // Getter to check if there are any selling models
    get hasSellingModels() {
        return this.sellingModels.length > 0;
    }

    // Getter to check if there is only one selling model (to avoid displaying the dropdown)
    get isSingleSellingModel() {
        return this.sellingModels.length === 1;
    }
}