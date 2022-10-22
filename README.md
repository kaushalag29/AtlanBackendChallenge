# Atlan-Backend-Challenge

### Problem Statement:
A very common need for organizations is wanting all their data onto Google Sheets, wherein they could connect their CRM, and also generate graphs and charts offered by Sheets out of the box. In such cases, each response to the form becomes a row in the sheet, and questions in the form become columns.

We preempt that with time, more similar use cases will arise, with different “actions” being required once the response hits the primary store/database. We want to solve this problem in such a way that each new use case can just be “plugged in” and does not need an overhaul on the backend. Imagine this as a whole ecosystem for integrations. We want to optimize for latency and having a unified interface acting as a middleman.

Design a sample schematic for how you would store forms (with questions) and responses (with answers) in the Collect data store. Forms, Questions, Responses and Answers each will have relevant metadata. Design and implement a solution for the Google Sheets use case and choose any one of the others to keep in mind how we want to solve this problem in a plug-n-play fashion. Make fair assumptions wherever necessary.

Eventual consistency is what the clients expect as an outcome of this feature, making sure no responses get missed in the journey. Do keep in mind that this solution must be failsafe, should eventually recover from circumstances like power/internet/service outages, and should scale to cases like millions of responses across hundreds of forms for an organization. 

There are points for details on how would you benchmark, set up logs, monitor for system health, and alerts for when the system health is affected for both the cloud as well as bare-metal. Read up on if there are limitations on the third party ( Google sheets in this case ) too, a good solution keeps in mind that too.

### Solution(System Design Explained)
There are two designs prepared based on the usage pattern of users:
- Serverless Design -> This will be beneficial with respect to cost of hosting/using the application when Users are not using the application frequently throughout the day.
- NonServerless Design -> Here, the server will be kept hosted on EC2 instances(even though system is not being consumed by users) throughout the lifespan of the system and will eventually be charged more cost. 

#### AWS Services Used
1. Application Load Balancer -> A load balancer serves as the single point of contact for clients. The load balancer distributes incoming application traffic across multiple targets, such as EC2 instances, in multiple Availability Zones. This increases the availability of our application.
2. DynamoDB -> NoSql database such as Amazon DynamoDB is a managed, scalable, and high performance key-value store. Like RDS, DynamoDB takes care of administrative tasks for us, so we can focus on high-value tasks. Data is stored across multiple facilities across a region to achieve high availability. DynamoDB also scales automatically with the size of data.
3. SQS -> SQS acts as glue for a distributed and highly scalable system. When a system is stitched together via asynchronous messaging, different parts of the system can scale or fail independently. s a managed service, SQS maintains availability of the queues for you. As a scalable service, SQS allows us to create an unlimited number of queues, which saves us from having to do capacity planning.
4. Lambda -> AWS Lambda runs our code written in Java, Node.js, and Python without requiring us to provision or manage servers. Lambda will run and scale our code with high availability, and we pay only for the compute time you consume in increments of 100 milliseconds. The code we upload will become Lambda functions, which can be triggered by various events on the AWS platform. Lambda functions can be thought of as first-class compute resources that we can insert into our AWS architecture.
5. APIGateway -> Amazon API Gateway is a fully managed service that makes it easy for developers to create, publish, maintain, monitor, and secure APIs at any scale. APIs act as the "front door" for applications to access data, business logic, or functionality from our backend services. Using API Gateway, we can create RESTful APIs and WebSocket APIs that enable real-time two-way communication applications. API Gateway supports containerized and serverless workloads, as well as web applications.
6. EC2 -> Amazon Elastic Compute Cloud (Amazon EC2) offers the broadest and deepest compute platform, with over 500 instances and choice of the latest processor, storage, networking, operating system, and purchase model to help us best match the needs of our workload.

#### Serverless Design
Here, DynamoDB acts as primary data storage for form submission responses. Whenever response is written to DynamoDB table(with streams enabled), an event(containing the form response) will be streamed to Standard SQS in the form of message. Now a lambda will be invoked every X minutes using AWS CloudWatch event rule(Event Bridge Schedule Expression) which will first read messages from Dead Letter Queue(it contains any messages(in batch) which gets failed to be processed for successive 3 attempts). If DLQ is empty, then it reads messages from Standard SQS and write those messages containing the required info into Google Sheets using sheets api.  

Why DynamoDB, SQS & Lambda?  
-> Relational database(RDS) has overhead associated with maintaining relationships between data. Hence, choosing NOSQL DynamoDB. Moreover, it's AWS Managed, easily scalable with high performance. Data is stored across multiple facilities across a region to achieve high availability. There are ways to create backups as well https://aws.amazon.com/dynamodb/backup-restore/.  
-> SQS(FIFO or Standard selected based on priority) helps in sustaining events even if a lambda fails to process messages. The failed messages will be stored in DLQ and will be tried to be processed in the next attempt by Lambda. Hence any power/internet/service failure from AWS side won't let in any loss/miss of responses. A SQS can theoretically contain infinite number of messages. There are some limitations with size of messages being stored in SQS. Each message should be not more than 256KB.
-> AWS Lambda is the actual backend code which will write the form response retrieved from SQS into Google Sheets. It supports multiple runtime environment like Node.js, Python, etc. It has max runtime limit of 15 mins. 1000 concurrent executions is allowed by default in AWS account which can be increased by requesting Quota increase. We can create as many replica of same lambda function which acts as consumer and evenly distribute traffic among them so that our application can be scaled easily for million consumers. 

#### NonServerless Design
This will be the most basic design which is being used extensively by many people. In the public subnet we will have api gateway for exposing apis to users and application load balancer which will balance traffic across clients and distributes the requests among ec2 instances. The ec2 instance will contain the code(server) which will write the data present in request body to Google Sheets. The ec2 instances will be autoscaled using Auto Scaling group based on threshold metrics being set. All EC2 instances will be in private subnet. The request will be streamed to load balancer from DynamoDB storing metadata of forms and responses. We can also use Amazon ECS instead of EC2 instances for better orchestration of system.

#### Monitoring logs, health and setting alerts of application
AWS provides Cloudwatch Logs, Metrics, Insights and Event Bridge as services for doing the same.
All executions/invocations logs and metrics of lambda/EC2 and api gateway will be stored in CloudWatch automatically if lambda is given required permissions in the IAM role. We can go to CloudWatch metrics dashboard for viewing different kind of metrics available for each service. We can use CloudWatch Insights for querying the metrics/logs and create our own dashboards based on logs filtering or metrics.
There are also ALB access logs for capturing the logs of load balancer whenever it is accessed by user. AWS has it's own services health dashboard as well as we can create our own personalized health dashboard.
We can set up AWS CloudWatch alarms for alerts and set up a rule stating if a specific metric of a service is ><= to some value, notify the user and perform an action. 
Using AWS config we can montior any infra changes(like change in iam role policy/ security groups) and take remediation action automatically.

#### Serverless vs NonServerless
1. Using serverless architecture we can save cost of provisioning servers. User will be billed only when the service is being used as compared to NonServerless approach.
2. Serverless design won't be real-time capturing the responses in Google Sheets. It will limited to polling by X minutes of lambda as well as additional latency of incoming request/event. Whereas in NonServerless design the request will directly interact with EC2 instance servers as soon as the data is written into DynamoDB. Minmizing the latency as well as trying to achieve real time response capturing.
3. Since SQS acts as intermediary in Serverless design for providing durability of events, it can withstand power/other outages. But in non serverless design, the request event can be lost if system went down during processing of event. 

### Code Structure
1. app.js -> Main code(Express Server with API(s))
2. public -> Directory to store output csv data of form responses
3. js -> Directory containing javascript files
4. schemas.json -> Schema definition for Questions(Forms)/Answers(Responses)
5. SystemDesign.png -> High level design of application

### Requirements
1. Node.js
2. Browser(Firefox/Chrome)
3. Linux(Recommended OS)

### Pre-Requisites
- Note: I can give you the credentials required for running the code for saving your time. Please ask me personally in the email.
1. Create an account in https://account.mongodb.com/account/login
2. Using MongoDB instead of DynamoDB since AWS account usage will charge cost.
3. PreStored Questions(Form) and Answers(Responses) in MongoDB collections(`questions` and `answers` in `form` database). Refer the `schemas.json` file in root directory. Sample data is present in `public/questions.json` and `public/answers.json`.

### Steps to install and execute code
1. Open a terminal
2. In the root directory of this project, execute `npm install`
3. Replace `<username>:<password> in DB_URL in js/database.js file` with correct username and password respectively.
4. Then execute `npm start`

A localhost server will be started at port 4000. `http://localhost:4000/`

### API Details
1. Method -> `GET` Api -> `/`  
Fetches the homepage of application.
2. Method -> `GET` Api -> `/question/:id`  
Retrieves the form questions of specific FormId or QuestionId provided in api path.
3. Method -> `GET` Api -> `/answer/:id`  
Retrieves the form response of specific ResponseId or AnswerId provided in api path.
4. Method -> `GET` Api -> `/answers/question/:id`  
Returns a downloadable csv file with question(as columns) and answers(as rows) of given QuestionId in api path.

