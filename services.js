const axios = require('axios').default;
const fetch = require('node-fetch')

let conversionRates = {
  'CADtoUSD': 1.2,  //comment this if want to use converion api 
  'EURtoUSD': 0.8,  //comment this if want to use converion api 
}

//every day get new conversion rates
setInterval(() => {
  conversionRates = {}
}, 1000 * 60 * 60 * 24)

const AMOUNT_THRESHOLD = 1000000

const checkEmail = (email) => {
  // var emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;  //slow
  var emailRegex = /[a-z0-9]+@[a-z]+\.[a-z]{2,3}/;  
  

  //returns null is no match
  let isValidEmail = !!email.match(emailRegex)

  return isValidEmail
}

const fetchPaymentsAndGetPaymentsWithQualityCheck = async (res) => {
  try{
    const response = await fetch('http://localhost:9292/api/bookings').then(res => res.json())
  
    const result = await getPaymentsWithQualityCheck(response.bookings)
  
    res.send(result)
  }catch(e){
    res.send({isSuccess: false, error: e.toString()})
  }
} 

//create a map for currencies - that will be deleted every 1 hour and filled again for latest currencies 
const getPaymentsWithQualityCheck = async (bookings) => {
  // let bookings = await axios.post('http://localhost:9292/api/bookings')  //didnt work with axios :/

  const payedUserIds = {}

  let resData = []

  for(booking of bookings){
    let resBooking = {}

    resBooking.reference = booking.reference
    resBooking.amount = booking.amount
    resBooking.studentId = booking.student_id

    let amountInDollars = await convertToDollars(booking.amount, booking.currency_from);

    resBooking.amountWithFees = getAmountWithFees(amountInDollars);

    resBooking.amountReceived = booking.amount_received

    //duplicate payment - if the booking.student_id already exists and already has a payment
    resBooking.qualityCheck = qualityCheck(booking, payedUserIds);

    resBooking.isOverPayment = booking.amount_received > resBooking.amountWithFees 
    resBooking.isUnderPayment = booking.amount_received < resBooking.amountWithFees 

    resData.push(resBooking)

    payedUserIds[resBooking.studentId] = true
  }

  return resData    
}

const tests = async (res) => {
  try{  //try is here due to async method
    let testResults = {}

    let paymentsAfterCheck = await getPaymentsWithQualityCheck([
      {
        "reference":"111",
        "amount":10000009,
        "amount_received":222,
        "country_from":"Sullust",
        "sender_full_name":"Sebulba",
        "sender_address":"2737 Kayden Summit",
        "school":"Southern Arkansas University",
        "currency_from":"cad",
        "student_id":111,
        "email":"badMail"
      },
      {
        "reference":"222",
        "amount":100,
        "amount_received":50,
        "country_from":"Sullust",
        "sender_full_name":"Sebulba",
        "sender_address":"2737 Kayden Summit",
        "school":"Southern Arkansas University",
        "currency_from":"CAD",
        "student_id":111,
        "email":"badMail2@gmail"
      },
      {
        "reference":"333",
        "amount":100,
        "amount_received":150,
        "country_from":"Sullust",
        "sender_full_name":"Sebulba",
        "sender_address":"2737 Kayden Summit",
        "school":"Southern Arkansas University",
        "currency_from":"usd",
        "student_id":111,
        "email":"goodEmail@gmail.com"
      }
    ])

    //test over and under payment
    testResults.isUnderPaymentTestPass = paymentsAfterCheck[0].isUnderPayment

    testResults.isOverPaymentTestPass = paymentsAfterCheck[2].isOverPayment 

    testResults.isAmountThresholdTestPass = paymentsAfterCheck[0].qualityCheck.includes('AmountThreshold')

    testResults.isDuplicatePaymentTestPass = paymentsAfterCheck[1].qualityCheck.includes('DuplicatePayment')

    testResults.isInvalidEmail = paymentsAfterCheck[0].qualityCheck.includes('InvalidEmail')

    //test conversion
    testResults.conversionTest1Pass = await convertToDollars(100, 'USD') == 100  //good conversion rate
    testResults.conversionTest2Pass = await convertToDollars(100, 'CAD') < 1000   //strange conversion rate
    testResults.conversionTest3Pass = await convertToDollars(100, 'CAD') > 1   //strange conversion rate
    testResults.conversionTest4Pass = await convertToDollars(100, 'cad') > 1   //strange conversion rate
    testResults.conversionTest5Pass = await convertToDollars(100, 'eur') > 1   //strange conversion rate
    testResults.conversionTest6Pass = await convertToDollars(100, 'eur') < 1000   //strange conversion rate

    //test email
    testResults.invalidEmailTest1Pass = qualityCheck({email: 'asd asd@gmail'}).includes('InvalidEmail')  
    testResults.invalidEmailTest2Pass = qualityCheck({email: 'asd@gmail'}).includes('InvalidEmail')  
    testResults.invalidEmailTest3Pass = qualityCheck({email: 'asd-@gmail.com'}).includes('InvalidEmail') 
    testResults.isValidEmailTestPass = !qualityCheck({email: 'mail@gmail.com'}).includes('InvalidEmail') 

    //check fees
    testResults.fees1Pass = parseFloat(getAmountWithFees(100)) == parseFloat(100 * 1.05)
    testResults.fees2Pass = parseFloat(getAmountWithFees(1500)) == parseFloat(1500 * 1.03)
    testResults.fees3Pass = parseFloat(getAmountWithFees(10005)) == parseFloat(10005 * 1.02)

    res.send(testResults)
  }catch(e){
    res.send({isSuccess: false, error: e.toString()})
  }
}

module.exports = {

  fetchPaymentsAndGetPaymentsWithQualityCheck,
  tests,
};

function checkIsAmountThreshold (amountInDollars){
  return amountInDollars > AMOUNT_THRESHOLD
}

function checkIsDuplicatePayment (studentId, payedUserIds) {
  if(!payedUserIds || !studentId){
    return false
  }

  return !!payedUserIds[studentId]
}

function qualityCheck(booking, payedUserIds) {
  qualityList = []

  let isValidEmail = checkEmail(booking.email);

  if(!isValidEmail){
    qualityList.push('InvalidEmail')
  }

  let isDuplicatePayment = checkIsDuplicatePayment(booking.student_id, payedUserIds);

  if(isDuplicatePayment){
    qualityList.push('DuplicatePayment')
  }

  let isAmountThreshold = checkIsAmountThreshold(booking.amount);

  if(isAmountThreshold){
    qualityList.push('AmountThreshold')
  }

  return qualityList.toString()
}

function getAmountWithFees(amountInDollars) {
  let amountWithFees

  if (amountInDollars <= 1000) {
    amountWithFees = amountInDollars * 1.05;
  } else if (amountInDollars > 1000 && amountInDollars <= 10000) {
    amountWithFees = amountInDollars * 1.03;
  } else {
    amountWithFees = amountInDollars * 1.02;
  }
  return amountWithFees;
}

async function convertToDollars(amount, currencyFrom) {
  let upperCurrencyFrom = currencyFrom.toUpperCase()
  let amountInDollars;
  if (currencyFrom.toUpperCase() != 'USD') {
    const conversionRateName = upperCurrencyFrom + 'toUSD';
    if (!conversionRates[conversionRateName]) {
      //curl --request GET 'https://api.apilayer.com/fixer/latest?base=USD&symbols=EUR,GBP' \
      let currencyConversionUrl = `https://api.apilayer.com/fixer/latest?base=USD&symbols=${booking.currency_from},USD`;
      //--header 'apikey: YOUR API KEY'
      let conversionRate = await fetch(currencyConversionUrl, {
        headers: {
          'apikey': '7jFrGClBqA8oGKs2xAJaBsZJ8dEOVRPr'
        }
      }).then(res => res.json());

      amountInDollars = amount * conversionRate.rates[upperCurrencyFrom];

      conversionRates[conversionRateName] = conversionRate.rates[upperCurrencyFrom] //save conversion rate for later uses
    } else {
      let conversionRate = conversionRates[conversionRateName];

      amountInDollars = amount * conversionRate;
    }
  } else {
    amountInDollars = amount
  }
  return amountInDollars;
}
