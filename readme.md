the server want touched.


========= APP =======

- to run the client:
  -  run "npm run client"
  - send get request to 'http://localhost:5000/payments_with_quality_check'

in the client , i converted both the 'amount' and the 'amount_received' to dollars. 

created an api call for real conversion rate, 
which is once a day cleared and populated again.
but for running purpuses its commented. 

to run the real api, just comment the items in conversionRates object.

======== tests ======

to run tests: 
  -  run "npm run client"
  - send get request to 'http://localhost:5000/test'

tried to create a positive and negative test for each field

tried to cover all fields, hopefully didnt miss anything.  

for testing , used the same methods as the regular route. 

thnx. 


