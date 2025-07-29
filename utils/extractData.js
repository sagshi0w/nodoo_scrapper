// ✅ If you're using ESM (with "type": "module" in package.json)
export default function extractSkillsAndExperience(job) {


    const commonSkills = [
        'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'AWS',
        'Excel', 'Communication', 'Teamwork', 'Problem Solving', 'Leadership',
        'Project Management', 'Data Analysis', 'Machine Learning',
        'JavaScript'
        , 'Python'
        , 'Java'
        , 'C++'
        , 'C#'
        , 'Rust'
        , 'HTML'
        , 'CSS'
        , 'React'
        , 'Vue.js'
        , 'Angular'
        , 'Node.js'
        , 'Express.js'
        , 'Django'
        , 'Spring Boot'
        , 'Ruby on Rails'
        , 'REST APIs'
        , 'GraphQL'
        , 'MySQL'
        , 'PostgreSQL'
        , 'MongoDB'
        , 'Redis'
        , 'Git'
        , 'GitHub'
        , 'CI/CD'
        , 'Jenkins'
        , 'GitHub Actions'
        , 'AWS'
        , 'Azure'
        , 'Google Cloud'
        , 'Docker'
        , 'Kubernetes'
        , 'Unit Testing'
        , 'Jest'
        , 'Mocha'
        , 'JUnit'
        , 'Debugging'
        , 'Object,Oriented Programming (OOP)'
        , 'Design Patterns'
        , 'Clean Code'
        , 'MVC'
        , 'Agile'
        , 'Scrum'
        , 'Kanban'
        , 'Jira'
        , 'Trello'

        , 'Python'
        , 'SQL'
        , 'Pandas'
        , 'NumPy'
        , 'Matplotlib'
        , 'Seaborn'
        , 'Scikit,learn'
        , 'TensorFlow'
        , 'Keras'
        , 'PyTorch'
        , 'XGBoost'
        , 'LightGBM'
        , 'OpenCV'
        , 'Hugging Face Transformers'
        , 'StatsModels'
        , 'Jupyter Notebooks'
        , 'Google Colab'
        , 'BigQuery'
        , 'Spark'
        , 'Airflow'
        , 'Docker'
        , 'MLflow'
        , 'AWS Sagemaker'
        , 'Azure ML Studio'
        , 'Data Wrangling'
        , 'Feature Engineering'
        , 'Model Evaluation'
        , 'A/B Testing'
        , 'Probability & Statistics'
        , 'Linear Algebra'
        , 'Optimization Algorithms'
        , 'Natural Language Processing (NLP)'
        , 'Computer Vision'
        , 'Time Series Forecasting'
        , 'Clustering Algorithms'
        , 'Regression Models'
        , 'Classification Models'
        , 'Deep Learning'
        , 'Reinforcement Learning'
        , 'MLOps'

        , 'Linux'
        , 'Shell Scripting'
        , 'Python'
        , 'Go'
        , 'CI/CD Pipelines'
        , 'Jenkins'
        , 'GitHub Actions'
        , 'GitLab CI'
        , 'Docker'
        , 'Kubernetes'
        , 'Helm'
        , 'Terraform'
        , 'Ansible'
        , 'Puppet'
        , 'Chef'
        , 'AWS'
        , 'GCP'
        , 'Azure'
        , 'CloudFormation'
        , 'Prometheus'
        , 'Grafana'
        , 'Datadog'
        , 'New Relic'
        , 'ELK Stack (Elasticsearch, Logstash, Kibana)'
        , 'Splunk'
        , 'Nagios'
        , 'Incident Management'
        , 'On,call Rotation'
        , 'Load Balancing'
        , 'High Availability (HA)'
        , 'Disaster Recovery'
        , 'Monitoring & Alerting'
        , 'Infrastructure as Code (IaC)'
        , 'Configuration Management'
        , 'System Architecture'
        , 'Network Security'
        , 'SSL / TLS'
        , 'DNS Management'
        , 'Service Mesh'
        , 'Istio'
        , 'SRE Principles'
        , 'SLIs / SLOs / SLAs'
        , 'Blue,Green Deployment'
        , 'Canary Releases'
        , 'Log Aggregation'

        , 'Network Security'
        , 'Firewalls'
        , 'IDS/IPS'
        , 'SIEM (e.g., Splunk, QRadar, LogRhythm)'
        , 'Penetration Testing'
        , 'Vulnerability Assessment'
        , 'Nmap'
        , 'Wireshark'
        , 'Burp Suite'
        , 'Metasploit'
        , 'Kali Linux'
        , 'SOC Monitoring'
        , 'Incident Response'
        , 'Threat Hunting'
        , 'Malware Analysis'
        , 'Reverse Engineering'
        , 'Cryptography'
        , 'Secure Coding'
        , 'OWASP Top 10'
        , 'Web Application Security'
        , 'Endpoint Security'
        , 'Mobile Security'
        , 'Cloud Security'
        , 'AWS Security'
        , 'Azure Security'
        , 'GCP Security'
        , 'Zero Trust Architecture'
        , 'IAM (Identity & Access Management)'
        , 'OAuth / SAML / JWT'
        , 'DevSecOps'
        , 'Security Auditing'
        , 'Forensics'
        , 'Log Analysis'
        , 'Firewall Management'
        , 'SSL/TLS'
        , 'Data Loss Prevention (DLP)'
        , 'ISO 27001'
        , 'NIST Framework'
        , 'Risk Management'
        , 'Security Compliance'
        , 'GRC (Governance, Risk & Compliance)'
        , 'Cyber Threat Intelligence'
        , 'Phishing Simulation'
        , 'Security Awareness Training'

        , 'Manual Testing'
        , 'Automation Testing'
        , 'Selenium'
        , 'Playwright'
        , 'Cypress'
        , 'Appium'
        , 'TestNG'
        , 'JUnit'
        , 'Postman'
        , 'API Testing'
        , 'UI Testing'
        , 'Mobile Testing'
        , 'Performance Testing'
        , 'Load Testing'
        , 'JMeter'
        , 'K6'
        , 'Security Testing'
        , 'Cross,Browser Testing'
        , 'Regression Testing'
        , 'Smoke Testing'
        , 'Sanity Testing'
        , 'Integration Testing'
        , 'Unit Testing'
        , 'System Testing'
        , 'End,to,End Testing'
        , 'Bug Tracking'
        , 'JIRA'
        , 'TestRail'
        , 'Test Case Design'
        , 'Test Planning'
        , 'Agile Testing'
        , 'CI/CD Integration'
        , 'Git'
        , 'Bitbucket'
        , 'DevTools Debugging'
        , 'BDD (Cucumber / Gherkin)'
        , 'TDD'
        , 'Database Testing'
        , 'MySQL'
        , 'MongoDB'
        , 'QAOps'
        , 'Version Control'
        , 'Mocking Tools'

        , 'Kotlin'
        , 'Java'
        , 'Swift'
        , 'Objective,C'
        , 'Dart'
        , 'JavaScript'
        , 'TypeScript'
        , 'Android SDK'
        , 'iOS SDK'
        , 'Flutter'
        , 'React Native'
        , 'SwiftUI'
        , 'Jetpack Compose'
        , 'Xcode'
        , 'Android Studio'
        , 'Expo'
        , 'MVVM'
        , 'MVP'
        , 'MVC'
        , 'Clean Architecture'
        , 'Dependency Injection (Hilt / Dagger / Koin)'
        , 'JUnit'
        , 'Espresso'
        , 'Mockito'
        , 'XCTest'
        , 'Appium'
        , 'Firebase Test Lab'
        , 'Debugging Tools'
        , 'Crashlytics'
        , 'CI/CD for Mobile'
        , 'REST APIs'
        , 'GraphQL'
        , 'Firebase'
        , 'Supabase'
        , 'Socket.IO'
        , 'OAuth 2.0'
        , 'JWT Authentication'

        , 'Solidity'
        , 'Vyper'
        , 'Rust'
        , 'JavaScript'
        , 'TypeScript'
        , 'Python'
        , 'Ethereum'
        , 'Polygon'
        , 'Binance Smart Chain (BSC)'
        , 'Solana'
        , 'Near'
        , 'Avalanche'
        , 'StarkNet'
        , 'zkSync'
        , 'Cosmos SDK'
        , 'Smart Contract Development'
        , 'Smart Contract Auditing'
        , 'Hardhat'
        , 'Truffle'
        , 'Foundry'
        , 'OpenZeppelin'
        , 'React.js'
        , 'Next.js'
        , 'Web3.js'
        , 'Ethers.js'
        , 'Wagmi'
        , 'RainbowKit'
        , 'Connect Wallet (MetaMask, WalletConnect)'
        , 'The Graph'
        , 'Moralis'
        , 'IPFS'
        , 'ERC,20'
        , 'ERC,721 (NFTs)'
        , 'ERC,1155'
        , 'Tokenomics'
        , 'DEX Integration'
        , 'Liquidity Pools'
        , 'Yield Farming'
        , 'Bridges'
        , 'Oracles (Chainlink)'
        , 'Gas Optimization'
        , 'Auditing Tools (Slither, MythX)'
        , 'Gnosis Safe'
        , 'Multisig Wallets'
        , 'Private Key Management'
        , 'Encryption'
        , 'Decentralized Storage'
        , 'Smart Contract Testing'
        , 'EVM Compatibility'
        , 'Layer 2 Scaling'
        , 'IPFS'
        , 'Pinata'
        , 'Alchemy'
        , 'Infura'
        , 'Chainlink'
        , 'Graph Protocol'
        , 'CI/CD for Smart Contracts'
        , 'Node Deployment'
        , 'RPC Management'

        , 'C++'
        , 'Embedded C'
        , 'Python'
        , 'Assembly Language'
        , 'Rust'
        , 'ARM Cortex'
        , 'AVR'
        , 'PIC'
        , '8051 Microcontroller'
        , 'RISC,V'
        , 'Raspberry Pi'
        , 'Arduino'
        , 'ESP32'
        , 'STM32'
        , 'FreeRTOS'
        , 'Zephyr RTOS'
        , 'VxWorks'
        , 'uC/OS'
        , 'Bare,Metal Programming'
        , 'Bootloaders'
        , 'Firmware Development'
        , 'Interrupt Handling'
        , 'Device Drivers'
        , 'UART'
        , 'SPI'
        , 'I2C'
        , 'CAN Bus'
        , 'Modbus'
        , 'Bluetooth'
        , 'Zigbee'
        , 'LoRa'
        , 'MQTT'
        , 'USB'
        , 'Digital Electronics'
        , 'Analog Electronics'
        , 'Circuit Design'
        , 'PCB Design'
        , 'Schematic Capture'
        , 'Multimeter & Oscilloscope Usage'
        , 'Signal Conditioning'
        , 'Power Management'
        , 'JTAG'
        , 'SWD (Serial Wire Debug)'
        , 'Logic Analyzer'
        , 'GDB Debugging'
        , 'Hardware Simulation'
        , 'Boundary Scan'
        , 'Unit Testing for Embedded'
        , 'Integration Testing'
        , 'Keil uVision'
        , 'IAR Embedded Workbench'
        , 'Eclipse IDE'
        , 'PlatformIO'
        , 'Segger J,Link'
        , 'Altium Designer'
        , 'Proteus'
        , 'KiCad'
        , 'MATLAB/Simulink'


        , 'Product Strategy'
        , 'Roadmapping'
        , 'User Research'
        , 'Wireframing'
        , 'Data Analysis'
        , 'A/B Testing'
        , 'Market Research'
        , 'Agile Methodology'
        , 'Scrum'
        , 'Feature Prioritization'
        , 'MVP Definition'
        , 'User Stories'
        , 'OKRs / KPIs'
        , 'Stakeholder Management'
        , 'Product Lifecycle Management'
        , 'Go,to,Market Strategy'
        , 'User Onboarding Optimization'
        , 'Conversion Rate Optimization (CRO)'
        , 'Customer Journey Mapping'
        , 'Figma (for collaboration)'
        , 'JIRA'
        , 'Notion'
        , 'Product Analytics (Mixpanel / Amplitude / GA)'
        , 'User Interface (UI)'
        , 'User Experience (UX)'
        , 'Design Systems'
        , 'Component,Based Design'
        , 'Interaction Design'
        , 'Information Architecture'
        , 'Accessibility (WCAG)'
        , 'Responsive Design'
        , 'Mobile,First Design'
        , 'Prototyping'
        , 'Figma'
        , 'Adobe XD'
        , 'Sketch'
        , 'Framer'
        , 'Webflow'
        , 'InVision'
        , 'Zeplin'
        , 'Illustrator'
        , 'Photoshop'
        , 'Lottie'
        , 'User Research'
        , 'Heuristic Evaluation'
        , 'Usability Testing'
        , 'Persona Development'
        , 'Design Thinking'
        , 'Journey Mapping'
        , 'Card Sorting'
        , 'A/B Testing for UX'
        , 'Empathy'
        , 'Problem Solving'
        , 'Cross,Functional Collaboration'
        , 'Storytelling'
        , 'Product Thinking'
        , 'Communication'
        , 'Creativity'
        , 'Strategic Thinking'
        , 'Attention to Detail'
        , 'User,Centered Mindset'
        , 'Decision,Making'


        , 'Performance Marketing'
        , 'Google Ads'
        , 'Meta Ads'
        , 'YouTube Ads'
        , 'LinkedIn Ads'
        , 'TikTok Ads'
        , 'Programmatic Advertising'
        , 'Remarketing / Retargeting'
        , 'Conversion Rate Optimization (CRO)'
        , 'Landing Page Optimization'
        , 'A/B Testing'
        , 'Campaign Management'
        , 'Content Marketing'
        , 'SEO'
        , 'On,Page SEO'
        , 'Off,Page SEO'
        , 'Technical SEO'
        , 'Keyword Research'
        , 'Blog Strategy'
        , 'Content Calendar Planning'
        , 'Content Writing'
        , 'Copywriting'
        , 'Storytelling'
        , 'Email Marketing'
        , 'Newsletter Strategy'
        , 'Email Automation'
        , 'Drip Campaigns'
        , 'CRM Tools (HubSpot, Mailchimp, etc.)'
        , 'Social Media Strategy'
        , 'Instagram Growth'
        , 'Twitter/X Marketing'
        , 'LinkedIn Content Strategy'
        , 'Influencer Marketing'
        , 'Brand Positioning'
        , 'Community Building'
        , 'UGC (User,Generated Content)'
        , 'Reels/Shorts Marketing'
        , 'Video Marketing'
        , 'Growth Loops'
        , 'Referral Programs'
        , 'Viral Campaigns'
        , 'Retention Marketing'
        , 'Lifecycle Marketing'
        , 'Onboarding Funnels'
        , 'User Activation Strategies'
        , 'App Store Optimization (ASO)'
        , 'Pricing Strategy'
        , 'Product Messaging'
        , 'Launch Strategy'
        , 'Google Analytics'
        , 'GA4'
        , 'Mixpanel'
        , 'Amplitude'
        , 'Hotjar / Clarity'
        , 'Funnel Analysis'
        , 'Attribution Modeling'
        , 'Marketing Automation'
        , 'Budget Planning'
        , 'ROI Optimization'
        , 'UTM Tagging'
        , 'Cohort Analysis'
        , 'Customer Segmentation'
        , 'CRM Analysis'

        , 'Lead Generation'
        , 'Cold Calling'
        , 'Cold Emailing'
        , 'Prospecting'
        , 'Pitching'
        , 'Sales Outreach'
        , 'Inbound Sales'
        , 'Outbound Sales'
        , 'Consultative Selling'
        , 'Solution Selling'
        , 'Account Management'
        , 'Client Relationship Management'
        , 'Sales Presentations'
        , 'Sales Negotiation'
        , 'Objection Handling'
        , 'Closing Deals'
        , 'B2B Sales'
        , 'B2C Sales'
        , 'Channel Sales'
        , 'Partnership Development'
        , 'Upselling & Cross,Selling'
        , 'Customer Retention'
        , 'Sales Funnel Management'
        , 'Follow,ups & Demos'
        , 'Proposal Writing'
        , 'RFP Handling'
        , 'Territory Management'
        , 'Quota Achievement'
        , 'Pipeline Management'
        , 'Salesforce'
        , 'HubSpot CRM'
        , 'Zoho CRM'
        , 'Pipedrive'
        , 'Outreach.io'
        , 'Apollo.io'
        , 'LinkedIn Sales Navigator'
        , 'Lusha / RocketReach'
        , 'Google Workspace'
        , 'Slack for Sales'
        , 'Calendly'
        , 'Notion'
        , 'Excel / Google Sheets'
        , 'Sales Analytics'
        , 'Sales Dashboards'

        , 'Lead Generation'
        , 'Cold Calling'
        , 'Cold Emailing'
        , 'Prospecting'
        , 'Pitching'
        , 'Sales Outreach'
        , 'Inbound Sales'
        , 'Outbound Sales'
        , 'Consultative Selling'
        , 'Solution Selling'
        , 'Account Management'
        , 'Client Relationship Management'
        , 'Sales Presentations'
        , 'Sales Negotiation'
        , 'Objection Handling'
        , 'Closing Deals'
        , 'B2B Sales'
        , 'B2C Sales'
        , 'Channel Sales'
        , 'Partnership Development'
        , 'Upselling & Cross,Selling'
        , 'Customer Retention'
        , 'Sales Funnel Management'
        , 'Follow,ups & Demos'
        , 'Proposal Writing'
        , 'RFP Handling'
        , 'Territory Management'
        , 'Quota Achievement'
        , 'Pipeline Management'
        , 'Salesforce'
        , 'HubSpot CRM'
        , 'Zoho CRM'
        , 'Pipedrive'
        , 'Outreach.io'
        , 'Apollo.io'
        , 'LinkedIn Sales Navigator'
        , 'Lusha / RocketReach'
        , 'Google Workspace'
        , 'Slack for Sales'
        , 'Calendly'
        , 'Notion'
        , 'Excel / Google Sheets'
        , 'Sales Analytics'
        , 'Sales Dashboards'



        , 'Process Optimization'
        , 'Operational Efficiency'
        , 'Business Process Mapping'
        , 'SOP Development'
        , 'Project Management'
        , 'Inventory Management'
        , 'Vendor Management'
        , 'Procurement'
        , 'Supply Chain Management'
        , 'Logistics Coordination'
        , 'Order Fulfillment'
        , 'Demand Forecasting'
        , 'Workforce Planning'
        , 'Capacity Planning'
        , 'Cost Reduction'
        , 'Risk Management'
        , 'Compliance Management'
        , 'KPI Tracking'
        , 'Budgeting & Forecasting'
        , 'Cross,functional Collaboration'
        , 'Service,Level Agreements (SLAs)'
        , 'Revenue Operations (RevOps)'
        , 'Sales Operations (SalesOps)'
        , 'Customer Operations'
        , 'People Operations (HR Ops)'
        , 'Facility Management'
        , 'Excel / Google Sheets'
        , 'Airtable'
        , 'Asana'
        , 'Trello'
        , 'Notion'
        , 'ClickUp'
        , 'Slack'
        , 'Google Workspace'
        , 'Zapier'
        , 'Monday.com'
        , 'Tableau'
        , 'Power BI'
        , 'SAP'
        , 'Oracle NetSuite'
        , 'Zoho Creator'
        , 'HubSpot Ops Hub'
        , 'JIRA'
        , 'ERP Systems'
        , 'CRM Tools'
        , 'Inventory Software (e.g., Unleashed, TradeGecko)'
        , 'TMS / WMS'


        , 'Financial Analysis'
        , 'Financial Modelling'
        , 'Budgeting & Forecasting'
        , 'Accounting Principles (GAAP/IFRS)'
        , 'Cash Flow Management'
        , 'Bookkeeping'
        , 'Auditing'
        , 'Tax Planning'
        , 'Cost Accounting'
        , 'Variance Analysis'
        , 'Revenue Recognition'
        , 'Accounts Payable'
        , 'Accounts Receivable'
        , 'Treasury Management'
        , 'Mergers & Acquisitions (M&A)'
        , 'Equity & Debt Financing'
        , 'Startup Finance'
        , 'Investor Relations'
        , 'Fundraising Strategy'
        , 'Valuation Techniques (DCF, Comparable, etc.)'
        , 'Risk Management'
        , 'Compliance Reporting'
        , 'Financial Reporting'
        , 'Unit Economics'
        , 'CFO,Level Strategy'
        , 'Legal Research'
        , 'Contract Drafting'
        , 'Contract Review'
        , 'Corporate Law'
        , 'Labor & Employment Law'
        , 'Intellectual Property (IP)'
        , 'Trademark Filing'
        , 'Legal Compliance'
        , 'Data Privacy (GDPR, CCPA)'
        , 'Company Secretarial Work'
        , 'Due Diligence'
        , 'Litigation Support'
        , 'Regulatory Compliance'
        , 'Licensing Agreements'
        , 'Founders Agreements'
        , 'Investor Agreements (SHA, SSA)'
        , 'NDAs & MOUs'
        , 'EULA & Terms of Use Drafting'
        , 'Arbitration & Mediation'
        , 'Legal Risk Assessment'
        , 'Startup Legal Advisory'
        , 'Contract Lifecycle Management (CLM)'
        , 'Tally'
        , 'Zoho Books'
        , 'QuickBooks'
        , 'Xero'
        , 'SAP'
        , 'Excel / Google Sheets'
        , 'Oracle Financials'
        , 'MS Power BI'
        , 'Tableau'
        , 'DocuSign'
        , 'CLM Tools (e.g., Ironclad, ContractWorks)'
        , 'Legal Tech Platforms'
        , 'Compliance Tools (e.g., VComply, LogicGate)'
        , 'Tax Filing Platforms (e.g., ClearTax)'
        , 'Data Room Management'


        , 'Talent Acquisition'
        , 'Recruitment Strategy'
        , 'Sourcing Techniques'
        , 'Screening & Interviewing'
        , 'Onboarding & Offboarding'
        , 'Employee Engagement'
        , 'HR Operations'
        , 'HR Policies & Compliance'
        , 'Compensation & Benefits'
        , 'Payroll Management'
        , 'Attendance & Leave Management'
        , 'Performance Management'
        , '360° Feedback'
        , 'Employee Relations'
        , 'Conflict Resolution'
        , 'Labor Law Compliance'
        , 'ESIC / PF Management'
        , 'Workforce Planning'
        , 'Succession Planning'
        , 'Organizational Development (OD)'
        , 'Learning & Development (L&D)'
        , 'Training Needs Analysis'
        , 'HR Analytics'
        , 'Diversity, Equity & Inclusion (DEI)'
        , 'Employer Branding'
        , 'HR Business Partnering'
        , 'Retention Strategy'
        , 'Internal Communication'
        , 'Excel / Google Sheets'
        , 'LinkedIn Recruiter'
        , 'Naukri.com'
        , 'Indeed'
        , 'Greenhouse'
        , 'Lever'
        , 'Zoho Recruit'
        , 'Workday'
        , 'BambooHR'
        , 'Keka'
        , 'Darwinbox'
        , 'SAP SuccessFactors'
        , 'ZingHR'
        , 'Hibob'
        , 'Freshteam'
        , 'Gusto'
        , 'Paychex'
        , 'Namely'
        , 'HRIS Management'
        , 'ATS Management'
        , 'LMS Platforms'
        , 'Survey Tools (e.g., CultureAmp, Officevibe)'


        , 'Customer Support'
        , 'Technical Support'
        , 'Product Troubleshooting'
        , 'Ticket Management'
        , 'Helpdesk Operations'
        , 'Customer Onboarding'
        , 'Customer Retention'
        , 'Customer Education'
        , 'Issue Resolution'
        , 'Escalation Management'
        , 'Knowledge Base Management'
        , 'Live Chat Support'
        , 'Email Support'
        , 'Phone Support'
        , 'CRM Management'
        , 'Service,Level Agreement (SLA) Handling'
        , 'Customer Feedback Collection'
        , 'Churn Analysis'
        , 'Customer Journey Mapping'
        , 'Account Health Monitoring'
        , 'Satisfaction Survey Analysis (CSAT/NPS)'
        , 'Community Support'
        , 'User Advocacy'
        , 'Customer Success Management'
        , 'Upsell & Cross,Sell Support'
        , 'Voice of Customer (VoC)'
        , 'Support Metrics Tracking'
        , 'Zendesk'
        , 'Freshdesk'
        , 'Zoho Desk'
        , 'Intercom'
        , 'Gorgias'
        , 'HubSpot Service Hub'
        , 'Kustomer'
        , 'Salesforce Service Cloud'
        , 'LiveChat'
        , 'Drift'
        , 'Tidio'
        , 'Help Scout'
        , 'Notion (Docs / Help Center)'
        , 'Slack for Support'
        , 'JIRA (for Escalations)'
        , 'Google Workspace'
        , 'Calendly (Support Scheduling)'
        , 'SurveyMonkey'
        , 'Typeform'
        , 'Loom (for Customer Tutorials)'


        , 'G-Suite'
    ];

    const knownCities = [
        "Bangalore", "Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Gurgaon", "Noida",
        "Kolkata", "Ahmedabad", "Jaipur", "Chandigarh", "Indore", "Lucknow", "Coimbatore", "Nagpur",
        "Surat", "Visakhapatnam", "Bhopal", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra",
        "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan", "Vasai", "Varanasi", "Srinagar", "Aurangabad",
        "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Jabalpur", "Gwalior",
        "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandrapur", "Solapur",
        "Remote", "Gurugram", "Kanpur", "Trichy", "Tiruchirappalli", "Mysore", "Thrissur", "Jamshedpur", "Udaipur",
        "Dehradun", "Hubli", "Dharwad", "Nellore", "Thane", "Panaji", "Shimla", "Mangalore",
        "Bareilly", "Salem", "Aligarh", "Bhavnagar", "Kolhapur", "Ajmer", "Belgaum", "Tirupati",
        "Rourkela", "Bilaspur", "Anantapur", "Silchar", "Kochi", "Thiruvananthapuram"
    ];

    const sectorKeywords = {
        "Technology / Engineering": [
            "developer",
            "engineer",
            "sde",
            "software",
            "programmer",
            "full stack",
            "frontend",
            "backend",
            "devops",
            "sre",
            "qa",
            "testing",
            "mobile",
            "android",
            "ios",
            "flutter",
            "react",
            "java",
            "python",
            "javascript",
            "cybersecurity",
            "blockchain",
            "web3",
            "embedded",
            "iot",
            "data science",
            "ml",
            "machine learning",
        ],
        "Product & Design": [
            "designer",
            "design",
            "ux",
            "ui",
            "product",
            "creative",
            "visual",
            "graphic",
            "content",
            "editor",
            "writer",
            "seo",
            "game design",
            "design research",
            "researcher",
            "product management",
        ],
        "Marketing & Growth": [
            "marketing",
            "growth",
            "digital",
            "seo",
            "content",
            "social",
            "brand",
            "campaign",
            "analytics",
            "performance marketing",
            "sem",
        ],
        "Sales & Business Development": [
            "sales",
            "business development",
            "business",
            "account",
            "revenue",
            "partnership",
            "channel sales",
            "client",
            "b2b",
            "customer success",
            "account manager",
            "enterprise sales",
            "inside sales",
        ],
        "Finance & Legal": [
            "finance",
            "financial",
            "accounting",
            "fp&a",
            "audit",
            "actuarial",
            "pricing",
            "strategy",
            "legal",
            "counsel",
            "compliance",
            "regulatory",
            "filing",
            "corporate",
            "budget",
            "investment banking",
            "vc",
            "venture capital",
            "corporate law",
        ],
        "Human Resources": [
            "hr",
            "human resource",
            "recruitment",
            "talent",
            "people operations",
            "people",
            "training",
            "learning",
            "development",
            "l&d",
            "hrbp",
        ],
        Operations: [
            "operations",
            "operational",
            "fleet",
            "supervisor",
            "coordinator",
            "manager",
            "process",
            "workflow",
            "efficiency",
            "planning",
            "supply chain",
            "procurement",
            "vendor management",
            "bizops",
        ],
        "Support & Customer Experience": [
            "support",
            "customer service",
            "helpdesk",
            "call center",
            "service",
            "technical support",
            "onboarding",
            "customer support",
        ],
    };



    // Function to extract experience range
    /**
    * Extracts and formats experience requirements with focus on "years of experience" patterns
    * @param {string} desc - Job description text
    * @returns {string} Formatted experience range or default text
    */
    const extractExperience = (desc) => {
        if (!desc) return 'Not specified';

        // Map number words to digits
        const numberWords = {
            one: 1, two: 2, three: 3, four: 4, five: 5,
            six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
            eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
            sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
        };

        // Try digit-based patterns first (existing logic)
        const patterns = [
            // Explicit range patterns with years/experience
            /(\d+)\s*-\s*(\d+)\s*years\s*of\s*experience/i,
            /(\d+)\s*to\s*(\d+)\s*years\s*of\s*experience/i,
            /(\d+)\s*\+\s*years\s*of\s*experience/i,
            /(\d+)\s*years\s*of\s*experience/i,
            /(\d+)\s*-\s*(\d+)\s*yrs\.?\s*of\s*exp\.?/i,
            /(\d+)\s*to\s*(\d+)\s*yrs\.?\s*of\s*exp\.?/i,
            /(\d+)\s*\+\s*yrs\.?\s*of\s*exp\.?/i,
            /(\d+)\s*yrs\.?\s*of\s*exp\.?/i,
            // General range patterns
            /(\d+)\s*-\s*(\d+)\s*years?/i,
            /(\d+)\s*to\s*(\d+)\s*years?/i,
            /(\d+)\s*\+\s*years?/i,
            /(\d+)\s*years?/i,
            /(?:experience|exp)\s*:\s*(\d+)\s*(?:-|\+)?\s*(\d+)?/i,
            /(?:minimum|min)\.?\s*(\d+)\s*years?/i
        ];

        for (const pattern of patterns) {
            const match = desc.match(pattern);
            if (match) {
                const minYears = parseInt(match[1]);
                const maxYears = match[2] ? parseInt(match[2]) : null;
                const isPlusRange = match[0].includes('+') ||
                    match[0].includes('least') ||
                    match[0].includes('minimum');

                // Format the output based on what we found
                if (maxYears) {
                    return `${minYears}-${maxYears} yrs`;
                } else if (isPlusRange) {
                    // For plus ranges, estimate max as min+2 (5+ → 5-7)
                    return `${minYears}-${minYears + 2} yrs`;
                } else {
                    // For single values, create range (14 → 12-14)
                    return `${Math.max(1, minYears - 2)}-${minYears} yrs`;
                }
            }
        }

        // Now try word-based patterns (e.g., 'six years of experience')
        const wordPattern = new RegExp(`(${Object.keys(numberWords).join('|')})[+\-\s]*years?\s*of\s*experience`, 'i');
        const wordMatch = desc.match(wordPattern);
        if (wordMatch) {
            const minYears = numberWords[wordMatch[1].toLowerCase()];
            // For single word, create a range as above
            return `${Math.max(1, minYears - 2)}-${minYears} yrs`;
        }

        return 'Not specified';
    };

    // Preprocess job description: remove 'description' at start, trim spaces, remove blank lines
    // function cleanDescription(desc) {
    //     if (!desc) return '';
    //     let cleaned = desc.trim();
    //     // Remove 'description' or 'Job description(s)' at the start (case-insensitive)
    //     cleaned = cleaned.replace(/^(job\s+)?descriptions?\s*[:\-]?\s*/i, '');
    //     // Remove any special characters and newlines from the beginning
    //     cleaned = cleaned.replace(/^[^a-zA-Z0-9\n\r]+/, '');
    //     // Remove extra blank lines and trim each line
    //     cleaned = cleaned.split('\n')
    //         .map(line => line.trim())
    //         .filter(line => line.length > 0)
    //         .join('\n');
    //     return cleaned;
    // }

    // Preprocess job description:
    function cleanDescription(desc) {
        if (!desc) return '';

        // Step 1: Normalize line endings and trim
        let cleaned = desc.replace(/\r\n/g, '\n').trim();

        // Step 2: Remove leading 'description' label
        cleaned = cleaned.replace(/^(job\s+)?descriptions?\s*[:\-]?\s*/i, '');

        // Step 3: Split into lines and clean each
        const lines = cleaned
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const formattedLines = [];

        for (let line of lines) {
            // Add bullet if it's a short sentence or keyword line
            if (
                line.length < 120 &&
                /^[a-zA-Z0-9]/.test(line) &&
                !line.endsWith('.') &&
                !line.includes('. ')
            ) {
                // Add bullet point and end with period if not already
                if (!line.endsWith('.')) line += '.';
                formattedLines.push('• ' + line);
            } else {
                // Ensure long lines end with a period if not already
                if (!line.endsWith('.')) line += '.';
                formattedLines.push(line);
            }
        }

        // Step 4: Join lines with appropriate spacing
        let finalText = formattedLines.join('\n');

        // Step 5: Add extra newlines between paragraphs (if needed)
        finalText = finalText.replace(/(\.)(\s*•)/g, '$1\n$2'); // new line before bullet
        finalText = finalText.replace(/([a-z])\. ([A-Z])/g, '$1.\n$2'); // break paragraphs

        return finalText.trim();
    }


    // Enhanced skill extraction with context awareness
    const extractSkills = (desc) => {
        if (!desc) return [];

        const foundSkills = new Set();
        const lowercaseDesc = desc.toLowerCase();

        // 1. First look for explicit skills sections
        const skillsSections = desc.match(/(?:skills|qualifications|requirements|competencies)[:\s-]+([\s\S]+?)(?:\n\n|\.\s|\n\s*\n|$)/i);

        if (skillsSections) {
            const sectionText = skillsSections[1].toLowerCase();
            commonSkills.forEach(skill => {
                if (sectionText.includes(skill.toLowerCase())) {
                    foundSkills.add(skill);
                }
            });
        }

        // 2. If no skills section found, search entire description
        if (foundSkills.size === 0) {
            commonSkills.forEach(skill => {
                if (lowercaseDesc.includes(skill.toLowerCase())) {
                    foundSkills.add(skill);
                }
            });
        }

        // 3. Special handling for common patterns
        if (lowercaseDesc.includes('excel') && lowercaseDesc.includes('skills')) {
            foundSkills.add('Excel');
        }
        if (lowercaseDesc.includes('communication skills')) {
            foundSkills.add('Communication');
        }

        return Array.from(foundSkills);
    };

    // Get job type.
    const extractJobType = (desc) => {
        if (!desc) return "Not specified";
        const lower = desc.toLowerCase();

        if (lower.includes("full time") || lower.includes("full-time")) return "Full Time";
        if (lower.includes("part time") || lower.includes("part-time")) return "Part Time";
        if (lower.includes("internship") || lower.includes("intern")) return "Internship";
        if (lower.includes("contract")) return "Contract";
        if (lower.includes("permanent")) return "Permanent";
        if (lower.includes("temporary")) return "Temporary";
        if (lower.includes("freelance")) return "Freelance";
        if (lower.includes("consultant")) return "Consultant";
        return "Full Time";
    };

    // Get city
    const extractCity = (location) => {
        if (!location) return "Not specified";

        // Normalize known aliases before matching
        let lowerLoc = location.toLowerCase();
        if (lowerLoc.includes("bengaluru") || lowerLoc.includes("bangaluru")) {
            lowerLoc = lowerLoc.replace(/bengaluru|bangaluru/g, "Bangalore");
        }

        for (const city of knownCities) {
            if (lowerLoc.includes(city.toLowerCase())) {
                return city;
            }
        }

        return "Not specified";
    };


    // Check if job is entry level or not.
    function isEntryLevelJob(title, experience) {
        const normalizedTitle = title.toLowerCase();
        const seniorityKeywords = [
            "sr.", "senior", "lead", "director", "head", "vp", "chief", "principal",
            "manager", "architect", "president", "executive", "expert", "specialist",
            "consultant", "supervisor", "officer", "owner", "founder", "co-founder",
            "ii", "sde 2", "sde 3", "2", "3"
        ];

        // Reject if title contains seniority indicators
        if (seniorityKeywords.some(keyword => normalizedTitle.includes(keyword))) {
            return false;
        }

        // No experience info or explicitly "not specified" → assume entry level
        if (!experience || experience.trim().toLowerCase() === "not specified") {
            return true;
        }

        // Extract year range like "0-1", "1-2", "1-3", etc.
        const match = experience.match(/(\d+)(?:\s*-\s*(\d+))?/);
        if (!match) return false;

        const min = parseInt(match[1], 10);
        const max = match[2] ? parseInt(match[2], 10) : min;

        // ✅ Entry-level if experience starts at 0 or 1 year
        return min <= 1;
    }


    // Catergorise job into different sectors
    function categorizeJob(title, description) {
        const normalizedTitle = (title || "").toLowerCase();
        const normalizedDescription = (description || "").toLowerCase();

        for (const [sector, keywords] of Object.entries(sectorKeywords)) {
            if (keywords.some(keyword =>
                normalizedTitle.includes(keyword)
            )) {
                return sector;
            }
        }

        return null;
    }

    // Get the date posted
    const getISOTimestamp = () => new Date().toISOString();

    return {
        ...job,
        // Clean the description before extracting info
        description: cleanDescription(job.description),
        skills: extractSkills(cleanDescription(job.description)),
        experience: extractExperience(cleanDescription(job.description)),
        sector: categorizeJob(job.title, cleanDescription(job.description)),
        isEntryLevel: isEntryLevelJob(job.title, cleanDescription(job.description)),
        jobType: extractJobType(cleanDescription(job.description)),
        location: extractCity(job.location),
        postedAt: getISOTimestamp()
    };
}
