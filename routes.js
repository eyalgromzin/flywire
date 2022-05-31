const services = require('./services')

exports.addRoutes = function addRoutes(app){

  //returns bookings_with_quality_check: [ { reference: (type: string), 
  //amount: (type: number), 
  //amountWithFees: (type: number), 
  //amountReceived: (type: number), 
  //qualityCheck: (type: string separated by commas), 
  //overPayment: (type: boolean), 
  //underPayment: (type: boolean) } ] }

  //the fee is on the payment. for each payment
  app.get('/payments_with_quality_check', (req, res) => {
    services.fetchPaymentsAndGetPaymentsWithQualityCheck(res) //
  });

  app.get('/test', (req, res) => {
    try{
      services.tests(res) 
    }catch(e){
      res.send(`exception: ${e.toString()}`)
    }
  });

}
