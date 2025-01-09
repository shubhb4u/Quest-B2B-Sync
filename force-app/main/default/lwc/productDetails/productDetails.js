import { LightningElement,track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getProductDetails from '@salesforce/apex/productDetail.getProductDetails'; // Apex method to fetch product details
//import getProductSellingModel from '@salesforce/apex/productDetail.getProductSellingModel';
import getVariationProduct from '@salesforce/apex/productDetail.getVariationProduct';
import { addItemToCart } from 'commerce/cartApi';
import { publish, MessageContext } from 'lightning/messageService';
import MY_MESSAGE_CHANNEL from '@salesforce/messageChannel/CustomChannel__c';
import getProfileName from '@salesforce/apex/Product2Controller.getProfileName';
import userId from '@salesforce/user/Id';

export default class ProductDetailTile extends LightningElement {

    @track product = null; // Main product details
    @track variations = []; // List of product variations
    @track selectedVariation = null; // Selected variation (if applicable)
    @track quantity = 1; // Default quantity
    @track dropdownVisible = {}; // Object to track which variation dropdowns are visible
    @track isATCModalOpen = false;
    @track hasPromotion = false;
    @track adjustmentPercent = false;
    @track adjustmentAmount = false;
    @track discountAmountExists  = false;
    @track isAdjustmentApplied = false;
    @track adjustmentAmountExists = false;
    @track modalTitle = '';
    @track modalMessage = '';
    @track modalType = '';
    _atcModalTimer;
    @track isTooltipVisible = false;

    showTooltip() {
        this.isTooltipVisible = true;
    }

    hideTooltip() {
        this.isTooltipVisible = false;
    }

    @wire(MessageContext)
    messageContext;


        //Added by Shubham fro Guest user access - ----------------------------------------------------------
        @track currentUser = {
            id: userId,
            profileName: null
        };

        @track isGuestUser = false;

        @wire(getProfileName)
        wiredProfileName({ data, error }) {
            if (data) {
                this.currentUser.profileName = data;
                console.log('Profile Name:', data);
                this.checkIsGuestUser();
            } else if (error) {
                console.error('Error fetching profile name:', error);
            }
        }

        checkIsGuestUser() {
            this.isGuestUser = this.currentUser.profileName === 'CI_Quest EStore Profile';
            console.log('Is Guest User:', this.isGuestUser);
        }

        //---------------------------------------------------------------------------------------

    handleUpdateCartCount() {
        const message = { action: 'updateCartCount', payload: 'Custom Data Add to cart' };
        publish(this.messageContext, MY_MESSAGE_CHANNEL, message);
        console.log(' Add to cart Message published:', message);
    }

    @wire(CurrentPageReference)
    getPageReference(pageReference) {
        if (pageReference) {
            const urlPath = pageReference.attributes.recordId; // Fetch product ID from URL
            if (urlPath) {
                this.fetchProductDetails(urlPath);
                this.fetchProductVariations(urlPath);
            }
        }
    }

    connectedCallback() {
        this.checkIsGuestUser();
        this.variations.forEach(variation => {
            variation.isDropdownVisible = false; // Start with all variations hidden
            variation.iconName = 'utility:chevrondown'; // Accordion up (collapsed) by default
        }); 
    }

             // Fetch product details (Now fetching discounted price from Promotions object)
            fetchProductDetails(productId) {
                console.log('Fetching product details for productId:', productId);
            
                getProductDetails({ productId })
                    .then((data) => {
                        if (data) {
                            console.log('Product details fetched successfully:', data);
            
                            // Extract the correct Product2Id
                            const product2Id = data.Product2Id;
                            console.log('Product2Id:', product2Id);
            
                            // Extract and log the currency symbol
                            const currencySymbol = data.CurrencyIsoCode === 'USD' 
                                ? '$' 
                                : data.CurrencyIsoCode === 'INR' 
                                ? '₹' 
                                : data.CurrencyIsoCode;
                            console.log('Determined currency symbol:', currencySymbol);
            
                            // Log whether the user is a guest
                            console.log('Is guest user:', this.isGuestUser);
            
                            // Process and log formatted unit price
                            const formattedUnitPrice = this.isGuestUser
                                ? 'Login to view price'
                                : Number(data.UnitPrice).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                });
                            console.log('Formatted unit price:', formattedUnitPrice);
            
                            // Process and log formatted discounted price
                            const formattedDiscountedPrice = this.isGuestUser || !data.DiscountedPrice
                                ? null
                                : Number(data.DiscountedPrice).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                });
            
                            // Check if discounted price exists and log
                            this.discountAmountExists = data.DiscountedPrice && data.DiscountedPrice !== 0;
                            console.log('Discount Amount Exists Track:', this.discountAmountExists);
            
                            if (this.discountAmountExists) {
                                console.log('Formatted discounted price:', formattedDiscountedPrice);
                            } else {
                                console.log('No discount available for this product.');
                            }
            
                            // Handle adjustment amount
                            const adjustmentAmount = data.AdjustmentAmount || 0;
                            console.log('Adjustment Amount in get product detail:', adjustmentAmount);
                            this.adjustmentAmountExists = adjustmentAmount !== 0;
                            console.log('Adjustment Amount Track:', this.adjustmentAmountExists);
            
                            // Create and log the final product object
                            this.product = {
                                ...data,
                                formattedUnitPrice,
                                formattedDiscountedPrice,
                                prodCurrencySymbol: currencySymbol,
                                adjustmentAmount,
                                adjustmentAmountExists: this.adjustmentAmountExists,
                            };
            
                            console.log('Final formatted product details:', this.product);
                        } else {
                            console.warn('No product data returned for productId:', productId);
                        }
                    })
                    .catch((error) => {
                        console.error('Error fetching product details:', error);
                        this.product = null; // Clear product data if error
                    });
            }
            

    get hasVariations() {
        return this.variations && this.variations.length > 0;
    }

    
   
                    fetchProductVariations(productId) {
                        console.log('Fetching product variations for productId:', productId);
                    
                        getVariationProduct({ productId })
                            .then((data) => {
                                console.log('Product variations fetched successfully:', data);
                    
                                if (data && data.length > 0) {
                                    console.log('Number of variations retrieved:', data.length);
                    
                                    this.variations = data.map((variation, index) => {
                                        console.log(`Processing variation ${index + 1}/${data.length}:`, variation);
                    
                                        // Determine the currency symbol
                                        const currencySymbol = variation.CurrencyIsoCode === 'USD' 
                                            ? '$' 
                                            : variation.CurrencyIsoCode === 'INR' 
                                            ? '₹' 
                                            : variation.CurrencyIsoCode;
                                        console.log('Determined currency symbol:', currencySymbol);
                    
                                        // Format the unit price
                                        const formattedUnitPrice = this.isGuestUser
                                            ? 'Login to view price'
                                            : variation.UnitPrice
                                            ? Number(variation.UnitPrice).toLocaleString('en-US', {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                              })
                                            : 'No Price Available';
                                        console.log('Formatted unit price:', formattedUnitPrice);
                    
                                        // Handle discounted price
                                        const formattedDiscountedPrice = this.isGuestUser || !variation.DiscountedPrice
                                            ? null
                                            : Number(variation.DiscountedPrice).toLocaleString('en-US', {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                              });
                                        console.log('Formatted discounted price:', formattedDiscountedPrice || 'No discounted price available');

                                        const adjustmentAmount = variation.AdjustmentAmount 
                                        ? Number(variation.AdjustmentAmount).toLocaleString('en-US', {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                          })
                                        : null;
                                    console.log('Adjustment amount Variation:', adjustmentAmount || 'No adjustment available');

                                    const isAdjustmentApplied = adjustmentAmount !== null;
                                    console.log('Adjustment applied:', isAdjustmentApplied);
                    
                                        const discountAmountExists = variation.DiscountedPrice && variation.DiscountedPrice !== 0;
                                        console.log('Discount amount exists:', discountAmountExists);
                    
                                        // Log additional properties
                                        console.log('Software version:', variation.SoftwareVersion);
                                        console.log('Variant parent ID:', variation.VariantParentId);
                                        console.log('Variant parent name:', variation.VariantParentName);
                    
                                        return {
                                            id: variation.ProductId,
                                            attributeId: variation.AttributeId,
                                            attributeName: variation.AttributeName,
                                            softwareVersion: variation.SoftwareVersion,
                                            name: variation.ProductName,
                                            description: variation.ProductDescription,
                                            sku: variation.ProductSKU,
                                            variantParentId: variation.VariantParentId,
                                            variantParentName: variation.VariantParentName,
                                            sellingModel: variation.SellingModelName
                                                ? {
                                                      name: variation.SellingModelName,
                                                      pricingTerm: variation.PricingTerm,
                                                      pricingTermUnit: variation.PricingTermUnit,
                                                      sellingModelType: variation.SellingModelType,
                                                  }
                                                : null,
                                            isDropdownVisible: false,
                                            iconName: 'utility:chevrondown',
                                            currency: variation.CurrencyIsoCode,
                                            currencySymbol,
                                            adjustmentAmount: adjustmentAmount, 
                                            price: formattedUnitPrice,
                                            discountedPrice: formattedDiscountedPrice,
                                            discountAmountExists,
                                            isAdjustmentApplied,
                                        };
                                    });
                    
                                    console.log('Processed all variations:', this.variations);
                    
                                    if (this.variations.length > 0) {
                                        console.log('Clearing parent product details because variations exist.');
                                        this.product = null;
                                    }
                                } else {
                                    console.log('No variations found for the product.');
                                }
                            })
                            .catch((error) => {
                                console.error('Error fetching product variations:', error);
                            });
                    }
                    
                    
            

    handleQuantityChange(event) {
        const productIdOrVariationId = event.target.dataset.id;
        const newQuantity = event.target.value;

        console.log('Quantity from this.product: ', this.product);
        console.log('Quantity from handle quantity: ', newQuantity);
        console.log('Product or Variation ID: ', productIdOrVariationId);

        // Check if it's a variation product (variationId) or non-variation product (productId)
        if (this.variations && this.variations.some(variation => variation.id === productIdOrVariationId)) {
            // It's a variation product
            const selectedVariation = this.variations.find(variation => variation.id === productIdOrVariationId);
            console.log('Selected variation: ', selectedVariation);

            if (selectedVariation) {
                selectedVariation.quantity = parseInt(newQuantity, 10);
                console.log('Updated quantity for variation: ', selectedVariation.quantity);
            }
        } else {
            // It's a non-variation product
            this.quantity = parseInt(newQuantity, 10);
            console.log('Updated quantity for the simple product: ', this.quantity);
        }
    }


    toggleDropdown(event) {
        const variationId = event.target.dataset.id;  // Get the id of the clicked variation

        // Update the state of all variations to toggle the dropdown visibility
        this.variations = this.variations.map(variation => {
            // If the variation ID matches the clicked ID, toggle its dropdown visibility
            if (variation.id === variationId) {
                return {
                    ...variation,
                    isDropdownVisible: !variation.isDropdownVisible, // Toggle visibility
                };
            }
            // Otherwise, ensure the dropdown remains closed
            return {
                ...variation,
                isDropdownVisible: false, // Keep other dropdowns closed
            };
        });
    }

    handleAddToCart(event) {
        const productIdOrVariationId = event.target.dataset.id;  // product or variation ID
        const quantity = event.target.dataset.quantity;  // The updated quantity

        console.log('Adding to cart:', productIdOrVariationId, 'Quantity:', quantity);

        addItemToCart(productIdOrVariationId, quantity)
        .then(() => {
            this.handleUpdateCartCount();
            this.modalTitle = 'Success';
            this.modalMessage = `Product was added to the cart`; // More descriptive message
            this.isATCModalOpen = true;
            this.modalType = 'success';
            this._atcModalTimer = setTimeout(() => {
                this.handleModalClose();
            }, 5000);
        })
        .catch((error) => {
            console.error('Error adding item to cart:', error);
            this.modalTitle = 'Error';
            this.modalMessage = 'Failed to add product to cart'; // Error message
            this.modalType = 'error';
            this.isATCModalOpen = true;
            this._atcModalTimer = setTimeout(() => {
                this.handleModalClose();
            }, 5000);
        });
    }

    handleModalClose() {
        if (this._atcModalTimer) {
            clearTimeout(this._atcModalTimer);
        }
        this.isATCModalOpen = false;
    }

    disconnectedCallback() {
        if (this._atcModalTimer) {
            clearTimeout(this._atcModalTimer);
        }
    }

    get computedHeaderClasses() {
        const baseClasses = 'slds-modal__header';
        if (this.modalType === 'success') {
            return `${baseClasses} success-header`;
        } else if (this.modalType === 'error') {
            return `${baseClasses} error-header`;
        }
        return baseClasses;
    }

    // Show toast notifications
    showToast({ title, message, variant }) {
        // Ensure we're in a browser environment (safety check)
        if (this.dispatchEvent) {
            const evt = new ShowToastEvent({
                title,
                message,
                variant
            });
            this.dispatchEvent(evt);
        } else {
            console.warn('Toast notification not supported in this context');
        }
    }
}