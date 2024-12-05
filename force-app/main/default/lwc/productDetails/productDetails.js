import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getProductDetails from '@salesforce/apex/productDetail.getProductDetails'; // Apex method to fetch product details
import getProductSellingModel from '@salesforce/apex/productDetail.getProductSellingModel';
import getProductDiscountList from '@salesforce/apex/productDetail.getProductRecsForDiscount';
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
    @track productDiscountList = [];
    @track isATCModalOpen = false;
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

    @wire(getProductDiscountList)
    wiredProductDiscountList({ error, data }) {
        if (data) {
            this.productDiscountList = data.map(product => ({
                ...product,
                formattedFinalPrice: product.Final_price__c
                    ? Number(product.Final_price__c).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                      })
                    : null,
            }));
        } else if (error) {
            console.error('Error retrieving product discount list:', error);
        }
    }

    connectedCallback() {
        this.checkIsGuestUser();
        this.variations.forEach(variation => {
            variation.isDropdownVisible = false; // Start with all variations hidden
            variation.iconName = 'utility:chevrondown'; // Accordion up (collapsed) by default
        });
    }

    fetchProductDetails(productId) {
        getProductDetails({ productId })
            .then((data) => {
                if (data) {
                    const discountedProduct = this.productDiscountList.find(
                        (product) => product.Id === data.Product2Id
                    );

                    const prodCurrency = data.CurrencyIsoCode;
                    let currencySymbol;
                    if(prodCurrency == 'USD') {
                        currencySymbol = '$';
                    } else if (prodCurrency == 'INR') {
                        currencySymbol = 'INR';
                    }

                    this.product = {
                        ...data,
                        formattedUnitPrice: this.isGuestUser ? 'Login to view price' : Number(data.UnitPrice).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }),
                        name: data.Product2.Name,
                        description: data.Product2.Description,
                        discountedPrice: discountedProduct && !this.isGuestUser
                            ? discountedProduct.formattedFinalPrice
                            : null, // Add discounted price if available
                        prodCurrencySymbol: currencySymbol
                    };
                    this.fetchProductSellingModel(productId);
                }
            })
            .catch((error) => {
                console.error('Error fetching product details:', error);
                this.product = null; // Clear product data if error
            });
    }

    // Fetch selling model details
    fetchProductSellingModel(productId) {
        getProductSellingModel({ productId })
            .then((data) => {
                if (data) {
                    this.product = {
                        ...this.product,
                        sellingModel: data.PricingTerm
                            ? {
                                  name: data.Name,
                                  pricingTerm: data.PricingTerm,
                                  pricingTermUnit: data.PricingTermUnit,
                                  sellingModelType: data.SellingModelType,
                              }
                            : null, // Set to null if no selling model data
                    };
                }
            })
            .catch((error) => {
                console.error('Error fetching product selling model:', error);
            });
    }
    // Working code
    // fetchProductVariations(productId) {
    //     getVariationProduct({ productId })
    //         .then((data) => {
    //             if (data && data.length > 0) {
    //                 this.variations = data.map((variation) => ({
    //                     id: variation.ProductId,
    //                     attributeId: variation.AttributeId,
    //                     attributeName: variation.AttributeName,
    //                     softwareVersion: variation.SoftwareVersion,
    //                     name: variation.ProductName,
    //                     description: variation.ProductDescription,
    //                     sku: variation.ProductSKU,
    //                     price: variation.UnitPrice
    //                         ? Number(variation.UnitPrice).toLocaleString('en-US', {
    //                               minimumFractionDigits: 2,
    //                               maximumFractionDigits: 2,
    //                           })
    //                         : null,
    //                     discountedPrice: variation.DiscountedPrice
    //                         ? Number(variation.DiscountedPrice).toLocaleString('en-US', {
    //                               minimumFractionDigits: 2,
    //                               maximumFractionDigits: 2,
    //                           })
    //                         : null,
    //                     variantParentId: variation.VariantParentId,
    //                     variantParentName: variation.VariantParentName,
    //                     sellingModel: variation.SellingModelName
    //                         ? {
    //                               name: variation.SellingModelName,
    //                               pricingTerm: variation.PricingTerm,
    //                               pricingTermUnit: variation.PricingTermUnit,
    //                               sellingModelType: variation.SellingModelType,
    //                           }
    //                         : null, // Set to null if no selling model data
    //                     isDropdownVisible: false, // For accordion functionality
    //                     iconName: 'utility:chevrondown', // Accordion up (collapsed) by default
    //                 }));

    //                 // Clear the parent product if variations exist
    //                 if (this.variations.length > 0) {
    //                     this.product = null;
    //                 }
    //             }
    //         })
    //         .catch((error) => {
    //             console.error('Error fetching product variations:', error);
    //         });
    // }

    get hasVariations() {
        return this.variations && this.variations.length > 0;
    }

    // Working but showing Undefined
    fetchProductVariations(productId) {
        getVariationProduct({ productId })
            .then((data) => {
                // Log the fetched data to check if the discounted price is included
                console.log('Fetched product variations data:', data);

                if (data && data.length > 0) {
                    this.variations = data.map((variation) => {
                        // Log the details of each variation
                        console.log('Processing variation:', variation);

                        const variationDetails = {
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
                                : null, // Set to null if no selling model data
                            isDropdownVisible: false, // For accordion functionality
                            iconName: 'utility:chevrondown', // Accordion up (collapsed) by default
                            currency: variation.CurrencyIsoCode
                        };

                        // Format the price fields
                        variationDetails.price = this.isGuestUser
                                                ? 'Login to view price'
                                                : variation.UnitPrice
                                                ? Number(variation.UnitPrice).toLocaleString('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : 'No Price Available';

                        // Handle the currency symbol based on CurrencyIsoCode
                        let currencySymbol = '';
                        if (variationDetails.currency === 'USD') {
                            currencySymbol = '$';
                        } else if (variationDetails.currency === 'INR') {
                            currencySymbol = '₹';
                        } else {
                            currencySymbol = variationDetails.currency;  // Default to CurrencyIsoCode if not USD or INR
                        }
                        variationDetails.currencySymbol = currencySymbol;
                            // Log if the discounted price exists
                        // console.log('Discounted price for variation', variation.id, variation.DiscountedPrice);
                        console.log(`Discounted price for variation ${variation.ProductId || 'N/A'}: `,
                                        variation.DiscountedPrice);
                       // Check and apply discounted price if available
                        if (variation.DiscountedPrice) {
                            variationDetails.discountedPrice = this.isGuestUser
                                                                ? null
                                                                : variation.DiscountedPrice
                                                                ? Number(variation.DiscountedPrice).toLocaleString('en-US', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                })
                                                                : null
                        }
                        console.log('Variation Details: ',variationDetails );
                        return variationDetails;
                    });

                    // Log the variations to check after mapping
                    console.log('Mapped variations:', this.variations);

                    // Clear the parent product if variations exist
                    if (this.variations.length > 0) {
                        this.product = null;
                    }
                }
            })
            .catch((error) => {
                console.error('Error fetching product variations:', error);
            });
    }

    // Handle Quantity Change for main product or variations
    // handleQuantityChange(event) {
    //     const variationId = event.target.dataset.id;
    //     const newQuantity = event.target.value;
    //     console.log('Quantity from this.product: ', this.product);
    //     console.log('Quantity from handle quantity: ', newQuantity);
    //     console.log('Quantity in variationId If: ',variationId);
    //     if (variationId ||variationId !='undefined') {
    //         const selectedVariation = this.variations.find((variation) => variation.id === variationId);
    //         console.log('Quantity in variationId If: ',selectedVariation);
    //         if (selectedVariation) {
    //             console.log('Quantity in selectedVariation: ');
    //             selectedVariation.quantity = newQuantity;
    //         }


    //     } else {
    //         this.quantity = parseInt(newQuantity,10);
    //         console.log('Quantity in Sample Product: ',this.quantity);
    //     }
    // }
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



    // toggleDropdown(event) {
    //     const variationId = event.target.dataset.id;
    //     this.variations = this.variations.map(variation => ({
    //         ...variation,
    //       //  isDropdownVisible: variation.id === variationId ? !variation.isDropdownVisible : false,
    //       isDropdownVisible: variation.id === variationId ? !variation.isDropdownVisible : variation.isDropdownVisible,
    //     }));
    // }
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

    // Handle Add to Cart functionality
    // handleAddToCart(event) {
    //     const productId = event.target.dataset.id;
    //     const quantity = event.target.dataset.quantity;
    //     console.log('Adding to cart:', productId, 'Quantity:', quantity);
    //     addItemToCart(productId, quantity)
    //         .then(() => {
    //            // this.handleUpdateCartCount();
    //             this.showToast('Success', 'Product added to cart!', 'success');
    //         })
    //         .catch((error) => {
    //             console.error('Error adding item to cart:', error);
    //             this.showToast('Error', 'Failed to add product to cart.', 'error');
    //         });
    // }
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