import { api, LightningElement, track, wire } from 'lwc';
import getSiteBaseUrl from '@salesforce/apex/SiteInfo.getSiteBaseUrl';
// import communityId from '@salesforce/community/Id';
import USER_ID from '@salesforce/user/Id';
import ACCOUNT_ID from '@salesforce/schema/User.AccountId';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import getProductRecs from '@salesforce/apex/ProductTile.getProductRecs';
import getProdId from '@salesforce/apex/ProductTile.getProdId';
// import createAndAddToList from '@salesforce/apex/ProductTile.createAndAddToList';
import { addItemToCart } from 'commerce/cartApi';
import addWishListItem from '@salesforce/apex/AddWishList.addWishListItem';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import WebstoreId from '@salesforce/label/c.WebstoreId';


export default class QuestProducts extends NavigationMixin(LightningElement) {
    @track products = [];
    @track filteredProducts = [];
    @track filters = {
        productFamily: '',
        quantityUnit: '',
        pricingMethod: ''
    };

    @track productFamilyOptions = [];
    @track quantityUnitOptions = [];
    @track pricingMethodOptions = [];

    accountId;
    siteBaseUrl;
    categoryURL
    categoryId;
    communityId;

    @wire(getSiteBaseUrl)
    wiredSiteBaseUrl({ error, data }) {
        if (data) {
            this.siteBaseUrl = data;
            console.log('baseUrl URL:-->>>', this.baseUrl);

        } else if (error) {
            console.error('Error fetching site base URL:', error);
        }
    }

    @wire(getRecord, { recordId: USER_ID, fields: [ACCOUNT_ID] })
    user({ data, error }) {
        if (data) {
            this.accountId = getFieldValue(data, ACCOUNT_ID);
        } else if (error) {
            console.error('Error fetching user data:', error);
        }
    }

    @wire(CurrentPageReference)
    getPageReference(pageReference) {
        if (pageReference?.attributes?.objectApiName === 'ProductCategory') {
            this.categoryId = pageReference.attributes.recordId;
            if (this.categoryId) {
                this.fetchProductsByCategory();
            } else {
                this.fetchProducts();
            }
        }
    }


    connectedCallback() {
        this.storeId = WebstoreId;
    }

    // Dynamically set filter options based on product data
    setFilterOptions() {
        const families = [...new Set(this.products.map(product => product.family || 'Unknown'))];
        const units = [...new Set(this.products.map(product => product.unit || 'Unknown'))];
        const pricingMethods = [...new Set(this.products.map(product => product.pricingMethod || 'Unknown'))];
    
        console.log('Families:', families);
        console.log('Quantity Units:', units);
        console.log('Pricing Methods:', pricingMethods);
    
        this.productFamilyOptions = this.generateOptions(families);
        this.quantityUnitOptions = this.generateOptionsUnits(units);
        this.pricingMethodOptions = this.generateOptionsPricing(pricingMethods);
    
        console.log('Generated Product Family Options:', this.productFamilyOptions);
        console.log('Generated Quantity Unit Options:', this.quantityUnitOptions);
        console.log('Generated Pricing Method Options:', this.pricingMethodOptions);
    }
    
    

    // Helper to generate options for lightning-combobox
    generateOptions(values) {
        return [{ label: 'Product Family', value: '' }, ...values.map(value => ({
            label: value === 'Unknown' ? 'Not Specified' : value, 
            value
        }))];
    }

    // Helper to generate options for lightning-combobox
    generateOptionsUnits(values) {
        return [{ label: 'Quantity of Measure', value: '' }, ...values.map(value => ({
            label: value === 'Unknown' ? 'Not Specified' : value, 
            value
        }))];
    }

    // Helper to generate options for lightning-combobox
    generateOptionsPricing(values) {
        return [{ label: 'Pricing Method', value: '' }, ...values.map(value => ({
            label: value === 'Unknown' ? 'Not Specified' : value, 
            value
        }))];
    }
    

    fetchProducts() {
        getProductRecs()
            .then((data) => {
                this.products = data.map(product => ({
                    ...product,
                    isWishlistItem: this.getWishListColor(product.Product2.isWishlistItem_Quest__c),
                    formattedUnitPrice: this.formatPrice(product.UnitPrice),
                    family: product.Product2.Family || 'Unknown', 
                    unit: product.Product2.QuantityUnitOfMeasure || 'Unknown', 
                    pricingMethod: product.Product2.SBQQ__PricingMethod__c || 'Unknown'

                }));
                this.filteredProducts = [...this.products]; 

                console.log('This products -->> '+ JSON.stringify(this.products));
                // Dynamically generate filter options
                this.setFilterOptions();
            })
            .catch((error) => {
                console.error('Error fetching products:', error);
            });
    }

    fetchProductsByCategory() {
        getProdId({ catId: this.categoryId })
            .then((data) => {
                if (data && data.length > 0) {
                    this.products = data.map((product) => ({
                        ...product,
                        isWishlistItem: this.getWishListColor(product.Product2.isWishlistItem_Quest__c),
                        formattedUnitPrice: this.formatPrice(product.UnitPrice),
                        family: product.Family,
                        unit: product.QuantityUnitOfMeasure,
                        pricingMethod: product.SBQQ__PricingMethod__c,
                        family: product.Product2.Family || 'Unknown', 
                        unit: product.Product2.QuantityUnitOfMeasure || 'Unknown', 
                        pricingMethod: product.Product2.SBQQ__PricingMethod__c || 'Unknown'
                    }));
    
                    this.filteredProducts = [...this.products]; 
                    console.log('This products -->> '+ JSON.stringify(this.products));
    
                    // Dynamically generate filter options for the products in this category
                    this.setFilterOptions();
                } else {
                    console.warn('No products returned for the selected category.');
                    this.products = [];
                    this.filteredProducts = [];
                    this.clearFilters(); // Clear filters if no products are available
                }
            })
            .catch((error) => {
                console.error('Error fetching products by category:', error);
            });
    }
    

    formatPrice(price) {
        return Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    getWishListColor(isAdded){
        return isAdded == true;
    }

    handleBuy(event) {
        
        const productId = event.target.dataset.id;
        // let productName = event.target.dataset.name;

        // let baseUrl = this.siteBaseUrl;
        // baseUrl = baseUrl.replace(/vforcesite/g, '');

        // productName = productName.toLowerCase();
        const url = `/product/${productId}`;
        console.log('Navigating to:', url);

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        });
    }


    handleAddToWishlist(event) {
        const productId = event.target.dataset.id;
        let listname = 'Sample Wishlist';
        if (!this.accountId || !this.storeId || !productId) {
            this.showToast('Error', 'Missing account, store, or product information', 'error');
            return;
        }

        // createAndAddToList({
        //     storeId: this.storeId,
        //     productId: productId,
        //     wishlistName: listname,
        //     effectiveAccountId: this.accountId
        // })
        //     .then(() => {
        //         this.dispatchEvent(
        //             new ShowToastEvent({
        //                 title: 'Success',
        //                 message: '{0} was added to a new list called "{1}"',
        //                 messageData: [this.displayableProduct.name, listname],
        //                 variant: 'success',
        //                 mode: 'dismissable'
        //             })
        //         );
                
        //     })
        //     .catch((error) => {
        //         console.error('Error adding to wishlist:', error);
        //         this.dispatchEvent(
        //             new ShowToastEvent({
        //                 title: 'Error',
        //                 message:
        //                     '{0} could not be added to a new list. Please make sure you have fewer than 10 lists or try again later',
        //                 messageData: [this.displayableProduct.name],
        //                 variant: 'error',
        //                 mode: 'dismissable'
        //             })
        //         );
        //     });



            addWishListItem({
                storeId: this.storeId,
                productId: productId,
                accountId: this.accountId
            })
                .then(() => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success',
                            message: '{0} was added to a new list called "{1}"',
                            messageData: [this.displayableProduct.name, listname],
                            variant: 'success',
                            mode: 'dismissable'
                        })
                    );
                    
                })
                .catch((error) => {
                    console.error('Error adding to wishlist:', error);
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error',
                            message:
                                '{0} could not be added to a new list. Please make sure you have fewer than 10 lists or try again later',
                            messageData: [this.displayableProduct.name],
                            variant: 'error',
                            mode: 'dismissable'
                        })
                    );
                });
    }


    handleFilterChange(event) {
        const filterType = event.target.dataset.id;
        this.filters[filterType] = event.detail.value;
        this.applyFilters();
    }

    applyFilters() {
        this.filteredProducts = this.products.filter(product => {
            return (!this.filters.productFamily || product.family === this.filters.productFamily) &&
                   (!this.filters.quantityUnit || product.unit === this.filters.quantityUnit) &&
                   (!this.filters.pricingMethod || product.pricingMethod === this.filters.pricingMethod);
        });
    }

    clearFilters() {
        this.filters = { productFamily: '', quantityUnit: '', pricingMethod: '' };
        this.filteredProducts = this.products;
    }
}