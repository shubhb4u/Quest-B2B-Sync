import { LightningElement } from 'lwc';

export default class CarouselComponent extends LightningElement {
    isFirstImage = true;
    isSecondImage = false;

    // Getters for dynamic classes to show the active image
    get firstImageClass() {
        return this.isFirstImage ? 'carousel-image active' : 'carousel-image';
    }

    get secondImageClass() {
        return this.isSecondImage ? 'carousel-image active' : 'carousel-image';
    }

    // Getters for dot indicators
    // get dot1Class() {
    //     return this.isFirstImage ? 'dot active' : 'dot';
    // }

    // get dot2Class() {
    //     return this.isSecondImage ? 'dot active' : 'dot';
    // }

    // Logic for navigating to the previous image
    previousImage() {
        if (this.isSecondImage) {
            this.isFirstImage = true;
            this.isSecondImage = false;
        } else {
            this.isFirstImage = false;
            this.isSecondImage = true;
        }
    }

    // Logic for navigating to the next image
    nextImage() {
        if (this.isFirstImage) {
            this.isFirstImage = false;
            this.isSecondImage = true;
        } else {
            this.isFirstImage = true;
            this.isSecondImage = false;
        }
    }

    // Show the first image on dot click
    // showFirstImage() {
    //     this.isFirstImage = true;
    //     this.isSecondImage = false;
    // }

    // Show the second image on dot click
    // showSecondImage() {
    //     this.isFirstImage = false;
    //     this.isSecondImage = true;
    // }
}