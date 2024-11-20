import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getProductDetails from '@salesforce/apex/productDetail.getProductDetails'; // Apex method to fetch product details
import getProductSellingModel from '@salesforce/apex/productDetail.getProductSellingModel';
import { addItemToCart } from 'commerce/cartApi';

export default class ProductDetailTile extends LightningElement {
    @track product;
    @track quantity = 1;

    @wire(CurrentPageReference)
    getPageReference(pageReference) {
        if (pageReference) {
            const urlPath = pageReference.attributes.recordId; // Fetch product ID from URL
            if (urlPath) {
                this.fetchProductDetails(urlPath);
            }
        }
    }

    fetchProductDetails(productId) {
        getProductDetails({ productId })
            .then((data) => {
                if (data) {
                    this.product = {
                        ...data,
                        formattedUnitPrice: Number(data.UnitPrice).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }),
                        name: data.Product2.Name,
                        description: data.Product2.Description
                    };
                    console.log('Product Details:', this.product);
                    console.log('Product Name:', this.product.name);
                    console.log('Product Description:', this.product.description);

                    // Fetch the selling model details
                this.fetchProductSellingModel(productId);
                }
            })
            .catch((error) => {
                console.error('Error fetching product details:', error);
                this.product = null; // Clear product data if error
            });
    }

    fetchProductSellingModel(productId) {
        getProductSellingModel({ productId })
            .then((data) => {
                if (data) {
                    // Add the fetched selling model details to the product object
                    this.product = {
                        ...this.product, // Preserve existing product details
                        sellingModel: {
                            name: data.Name,
                            pricingTerm: data.PricingTerm,
                            pricingTermUnit: data.PricingTermUnit,
                            sellingModelType: data.SellingModelType
                        }
                    };
                    console.log('Selling Model Details:', this.product.sellingModel);
                }
            })
            .catch((error) => {
                console.error('Error fetching product selling model:', error);
            });
    }
    

    handleQuantityChange(event) {
        this.quantity = event.target.value;
    }

    handleAddToCart(event) {
        const productId = event.target.dataset.id; // Get the product ID
        const quantity =  this.quantity;
    
        console.log('Product ID:', productId);
        console.log('Quantity:', quantity);
        
        addItemToCart(productId, quantity)
            .then(() => {
                this.showToast();
                // window.location.href = 'https://providiodev--dev004.sandbox.my.site.com/CIQuestEStore/cart';
            })
            .catch((error) => {
                console.error('Error adding item to cart:', error);
                this.showErrorToast();
            });
    }

}