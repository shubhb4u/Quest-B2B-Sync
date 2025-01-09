import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import getProductsByCode from '@salesforce/apex/Product2Controller.getProductsByCode';

// Define the field to fetch
const FIELDS = ['Product2.Feature_3__c'];

export default class ProductHtmlRenderer extends LightningElement {
    @api recordId; // Automatically populated on a product record page
    productDetails; // Holds the HTML content
    error;
    feature3;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredGetProduct({ error, data }) {
        if (data) {
            console.log('getRecord Product data: ', data);
            this.productDetails = data.fields.Feature_3__c.value;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.productDetails = undefined;
            console.log('error: getRecord Product data: ', error);
        }
    }

    @wire(getProductsByCode, { productSKU1: 'OVD-SPX-PS-UX-TRE247', productSKU2: '', productSKU3: '', productSKU4:'' })
    wiredProductbyCode({ error, data }) {
      console.log('productSKU1 data: ', data);
        if (data && data.length > 0) {
            console.log('productSKU1 data: ', data);
            this.feature3 = data[0].Feature_3__c;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.feature3 = undefined;
            console.log('error: productSKU1 data: ', error);
        }
    }
    connectedCallback() {
        console.log('connectedCallback: feature3: ', this.feature3);
        console.log('connectedCallback: productDetails: ', this.productDetails);
    }

    renderedCallback() {
      console.log('renderedCallback: feature3: ', this.feature3);
          console.log('renderedCallback: productDetails: ', this.productDetails);
      if (this.productDetails || this.feature3) {
          const container = this.template.querySelector('.html-container');
          console.log('renderedCallback2: feature3: ', this.feature3);
          console.log('renderedCallback3: productDetails: ', this.productDetails);

          if (container) {
              console.log('container', container.length);
              console.log('container', container.classList);
              console.log('container', container.className);
              console.log('container', container.classList.contains('html-container'));
              if (this.productDetails) {
                container.innerHTML=this.productDetails;
                // container.appendChild(this.productDetails);
              } else if (this.feature3) {
                container.innerHTML = this.feature3;
                // container.appendChild(this.feature3);
              }

          }
          const container3 = this.template.querySelector('.html-container3');
          console.log('container3', container3.classList)
          if (container3) {
            if (this.productDetails) {
              container3.innerHTML=this.productDetails;
              // container3.appendChild(this.productDetails);
            } else if (this.feature3) {
              container3.innerHTML = this.feature3;
              // container3.appendChild(this.feature3);
            }
          }
      }
  }

}