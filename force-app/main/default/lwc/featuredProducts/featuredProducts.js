import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getProductRecords from '@salesforce/apex/FeaturedProductsController.getProductRecords';

export default class FeaturedProducts extends  NavigationMixin(LightningElement) {
    @track products = [];
    @api pricebookID; // Exposed public property to pass the product code
    // Fetch products when the component is connected to the DOM
    connectedCallback() {
        this.fetchProducts();
    }


    // Fetch products from Apex
    fetchProducts() {
        getProductRecords({ pricebookId: this.pricebookID })
            .then((data) => {
                console.log('this.pricebookID', this.pricebookID)
                this.products = data;
                console.log('Fetched products:', this.products);
                console.log('Fetched product from home page');
            })
            .catch((error) => {
                console.error('Error fetching products:', error);
            });
    }

    // Handle the 'Buy' button click action
    handleBuy(event) {
        const productId = event.target.dataset.id;
        const url = `/product/${productId}`;
        console.log('productId',productId);

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        });
    }
}