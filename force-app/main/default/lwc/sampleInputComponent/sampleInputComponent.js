import { LightningElement } from 'lwc';

export default class SampleInputComponent extends LightningElement {
    name = ''; // Holds the input value

    // Handles input change
    handleInputChange(event) {
        this.name = event.target.value;
    }

    // Handles button click
    handleSubmit() {
        // Logic for the button action
        if (this.name) {
            alert(`Hello, ${this.name}!`);
        } else {
            alert('Please enter your name.');
        }
    }
}