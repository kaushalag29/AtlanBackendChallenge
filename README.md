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
2. DynamoDB -> Relational database(RDS) has overhead associated with maintaining relationships between data. Hence, choosing DynamoDB. NoSql database such as Amazon DynamoDB is a managed, scalable, and high performance key-value store. Like RDS, DynamoDB takes care of administrative tasks for us, so we can focus on high-value tasks. Data is stored across multiple facilities across a region to achieve high availability. DynamoDB also scales automatically with the size of data.
3. SQS -> SQS acts as glue for a distributed and highly scalable system. When a system is stitched together via asynchronous messaging, different parts of the system can scale or fail independently. s a managed service, SQS maintains availability of the queues for you. As a scalable service, SQS allows us to create an unlimited number of queues, which saves us from having to do capacity planning.
4. Lambda -> AWS Lambda runs our code written in Java, Node.js, and Python without requiring us to provision or manage servers. Lambda will run and scale our code with high availability, and we pay only for the compute time you consume in increments of 100 milliseconds. The code we upload will become Lambda functions, which can be triggered by various events on the AWS platform. Lambda functions can be thought of as first-class compute resources that we can insert into our AWS architecture.
5. APIGateway -> Amazon API Gateway is a fully managed service that makes it easy for developers to create, publish, maintain, monitor, and secure APIs at any scale. APIs act as the "front door" for applications to access data, business logic, or functionality from our backend services. Using API Gateway, we can create RESTful APIs and WebSocket APIs that enable real-time two-way communication applications. API Gateway supports containerized and serverless workloads, as well as web applications.
6. EC2 -> Amazon Elastic Compute Cloud (Amazon EC2) offers the broadest and deepest compute platform, with over 500 instances and choice of the latest processor, storage, networking, operating system, and purchase model to help us best match the needs of our workload.

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

