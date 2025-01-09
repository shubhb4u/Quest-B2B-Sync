import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { NavigationMixin } from 'lightning/navigation';
import getFilteredProducts from '@salesforce/apex/searchResult.getFilteredProducts';
import UnitPrice from '@salesforce/schema/PricebookEntry.UnitPrice';

export default class ProductResults extends NavigationMixin(LightningElement) {
    @track products;
    @track error;
    searchKey;
    prodCurrency = 'USD';
    currencySymbol = '';
    @track isLoading = false;

    connectedCallback(){
        this.dynamicCurrencySymbol();
    }

    dynamicCurrencySymbol() {
        if (this.prodCurrency === 'USD') {
            this.currencySymbol = '$';
        } else if (this.prodCurrency === 'INR') {
            this.currencySymbol = '₹'; // Using ₹ symbol for INR
        } else {
            this.currencySymbol = ''; // Default if currency is unknown
        }
        console.log('Resolved Currency Symbol: ', this.currencySymbol);
    }

    @wire(CurrentPageReference)
    setPageReference(currentPageReference) {
        if (currentPageReference) {
            console.log('Current Page Reference:', currentPageReference);

            // Check if `state` and `searchKey` exist
            if (currentPageReference.state && currentPageReference.state.searchKey) {
                this.searchKey = currentPageReference.state.searchKey;
                console.log('Search key received:', this.searchKey);

                // Trigger fetchProducts only if a searchKey is found
                this.fetchProducts();
            } else {
                console.log('No search key found in URL state:', currentPageReference.state);
            }
        } else {
            console.error('Current Page Reference is undefined.');
        }
    }

    fetchProducts() {
        console.log('Fetching products with search key:', this.searchKey);
        this.isLoading = true;
        
        getFilteredProducts({ searchKey: this.searchKey })
            .then(result => {
                if (result.length > 0) {
                    console.log('Products fetched:', result);
                    this.products = result.map(product => {
                        const unitPrice = 
                            product.PricebookEntries && product.PricebookEntries.length > 0
                                ? product.PricebookEntries[0].UnitPrice
                                : 0;
                        return { ...product, UnitPrice: unitPrice, currencySymbol: this.currencySymbol};
                    });
                    this.error = undefined;
                }    else {
                    console.log('No products found for search key:', this.searchKey);
                    this.products = [];
                    this.error = 'No products found.';
                }
            })
            .catch(error => {
                console.error('Error fetching products:', error);
                this.error = error.body.message;
                this.products = undefined;
            })
            .finally(()=>{
                this.isLoading = false;
            })
    }

    handleProductClick(event) {
        const productId = event.target.dataset.id;

        // Navigate to the Product Detail Page
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: productId,
                objectApiName: 'Product2', // Replace with your product object API name if different
                actionName: 'view'
            }
        });
    }
}