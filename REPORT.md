\# System Security Workshop 1 Report 



I tested my original load balancer by sending  100 re quests at 17 different intervals, from 500 ms down to 1 ms. All tests had 100 successful requests and no failures.



The thro ughput increased from 1.97 requests per  second at 500 ms to 73.9 requests per second at 1 ms. The average response time stayed around 2–3 ms.



The test  results were saved as JSO N and CSV files in the `results` folder. Overall, the load balancer worked well in my tests.  I still need to test different configurations, serv er failures and security features such as rate limiting and request size limits.

