import React from 'react';

const payments = {}; // Dummy object for representation

const MyComponent = () => {
    // Other code
    const years = Object.keys(payments).map(Number).sort((a, b) => b - a);
    // Other code
};

export default MyComponent;