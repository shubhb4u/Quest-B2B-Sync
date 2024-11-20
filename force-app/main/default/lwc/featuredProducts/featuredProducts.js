import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getProductRecords from '@salesforce/apex/FeaturedProductsController.getProductRecords';
import getSiteBaseUrl from '@salesforce/apex/FeaturedProductsController.getSiteBaseUrl';

export default class FeaturedProducts extends  NavigationMixin(LightningElement) {
    @track products = [];
    @api pricebookID; // Exposed public property to pass the product code

    siteBaseUrl;
    @wire(getSiteBaseUrl)
    wiredSiteBaseUrl({ error, data }) {
        if (data) {
            this.siteBaseUrl = data; // Set the base URL
        } else if (error) {
            console.error('Error fetching site base URL:', error);
        }
    }

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
            })
            .catch((error) => {
                console.error('Error fetching products:', error);
            });
    }

    // Handle the 'Buy' button click action
    handleBuy(event) {
        const productId = event.target.dataset.id;
        let productName = event.target.dataset.name;
        let baseUrl = this.siteBaseUrl;
        baseUrl = baseUrl.replace(/vforcesite/g, '');

        productName = productName.toLowerCase();
        const url = `${baseUrl}/product/${productName}/${productId}`;
        console.log('Navigating to:', url);

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        });
    }
}