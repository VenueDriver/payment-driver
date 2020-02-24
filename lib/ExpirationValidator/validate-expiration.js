function validateExpirationDate(paymentRequest){
    var result = true;

    //Check if the expiration date is valid
    var maxDate = new Date(paymentRequest.event_open).toISOString();
    var maxDateinmils = new Date(maxDate).getTime();
    var formDate = new Date(paymentRequest.expiration).getTime();

    //returns true if valid or false if date provided is greater
    //than the event open date/time.
    if(parseInt(formDate) > parseInt(maxDateinmils)){
        result = false;
    }

    return result;
}


module.exports = validateExpirationDate;