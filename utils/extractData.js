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
        "Mumbai", "Bangalore", "Delhi", "Hyderabad", "Chennai", "Pune", "Gurgaon", "Noida",
        "Kolkata", "Ahmedabad", "Jaipur", "Chandigarh", "Indore", "Lucknow", "Coimbatore", "Nagpur",
        "Surat", "Visakhapatnam", "Bhopal", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra",
        "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan", "Vasai", "Varanasi", "Srinagar", "Aurangabad",
        "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Jabalpur", "Gwalior",
        "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandrapur", "Solapur",
        "Remote", "Kanpur", "Trichy", "Mysore", "Thrissur", "Jamshedpur", "Udaipur", "Dehradun",
        "Hubli", "Dharwad", "Nellore", "Thane", "Panaji", "Shimla", "Mangalore", "Bareilly", "Salem",
        "Aligarh", "Bhavnagar", "Kolhapur", "Ajmer", "Belgaum", "Tirupati", "Rourkela", "Bilaspur",
        "Anantapur", "Silchar", "Kochi", "Thiruvananthapuram", "Bhubaneswar", "Imphal", "Shillong",
        "Aizawl", "Itanagar", "Kohima", "Gangtok", "Patiala", "Jammu", "Shimoga", "Muzaffarpur", "Gandhinagar"
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
            "quality assurance",
            "testing",
            "automation engineer",
            "test engineer",
            "mobile",
            "android",
            "ios",
            "flutter",
            "react",
            "react native",
            "angular",
            "vue",
            "node",
            "java",
            "python",
            "c++",
            "c#",
            ".net",
            "php",
            "ruby",
            "go",
            "rust",
            "swift",
            "javascript",
            "typescript",
            "cybersecurity",
            "security engineer",
            "ethical hacker",
            "penetration tester",
            "blockchain",
            "web3",
            "smart contract",
            "solidity",
            "embedded",
            "firmware",
            "iot",
            "cloud engineer",
            "aws",
            "azure",
            "gcp",
            "data engineer",
            "data analyst",
            "data scientist",
            "ml",
            "machine learning",
            "ai",
            "deep learning",
            "nlp",
            "computer vision",
            "big data",
            "hadoop",
            "spark",
            "kubernetes",
            "docker",
            "site reliability engineer",
            "infrastructure engineer",
            "platform engineer",
            "system architect",
            "application architect",
            "integration engineer",
            "build engineer",
            "release engineer",
            "game developer",
            "unity",
            "unreal engine"
        ],
        "Product & Design": [
            "designer",
            "design",
            "ux",
            "ui",
            "ux/ui",
            "product",
            "product manager",
            "product owner",
            "creative",
            "visual",
            "graphic",
            "ux writer",
            "content designer",
            "game design",
            "game designer",
            "furniture design",
            "design system specialist",
            "accessibility designer",
            "mobile app designer",
            "web designer",
            "interaction designer",
            "human-centered designer",
            "communication designer",
            "experience architect",
            "service designer",
            "game ux designer",
            "packaging designer",
            "logo designer",
            "illustrator",
            "brand strategist",
            "branding specialist",
            "art director",
            "designOps manager",
            "visual effects (vfx) artist",
            "motion designer",
            "3d designer",
            "3d artist",
            "interactive designer",
            "creative director",
            "design research",
            "researcher",
            "product strategist",
            "wireframe designer",
            "prototype designer",
            "user researcher",
            "usability analyst",
            "information architect",
            "storyboard artist",
            "animation designer",
            "concept artist",
            "colorist",
            "digital artist",
            "industrial designer",
            "set designer",
            "environment designer",
            "game environment artist",
            "props designer",
            "retail space designer"
        ],
        "Marketing & Growth": [
            "marketing",
            "growth",
            "growth hacker",
            "growth marketing",
            "digital",
            "digital marketing",
            "seo",
            "search engine optimization",
            "content",
            "content marketing",
            "content strategist",
            "copywriter",
            "copywriting",
            "social",
            "social media",
            "social media manager",
            "community manager",
            "community growth",
            "brand",
            "brand manager",
            "branding",
            "campaign",
            "campaign manager",
            "email marketing",
            "email automation",
            "marketing automation",
            "crm marketing",
            "crm manager",
            "performance marketing",
            "paid marketing",
            "paid social",
            "paid search",
            "ppc",
            "sem",
            "search engine marketing",
            "display advertising",
            "programmatic advertising",
            "affiliate marketing",
            "influencer marketing",
            "event marketing",
            "product marketing",
            "go-to-market",
            "market research",
            "marketing analytics",
            "analytics",
            "data-driven marketing",
            "conversion rate optimization",
            "cro",
            "app store optimization",
            "aso"
        ],
        "Sales & Business Development": [
            "sales",
            "sales executive",
            "sales manager",
            "sales associate",
            "sales representative",
            "sales rep",
            "sales lead",
            "sales director",
            "sales consultant",
            "business development",
            "business development executive",
            "business development manager",
            "business development associate",
            "business",
            "account",
            "account executive",
            "account manager",
            "account director",
            "key account manager",
            "strategic account manager",
            "major account manager",
            "revenue",
            "revenue growth",
            "partnership",
            "partnership manager",
            "strategic partnerships",
            "alliances manager",
            "channel sales",
            "channel partner manager",
            "client",
            "client relationship manager",
            "client services",
            "client partner",
            "customer success",
            "customer success manager",
            "customer success executive",
            "customer success associate",
            "b2b",
            "b2c",
            "enterprise sales",
            "inside sales",
            "field sales",
            "regional sales",
            "territory sales",
            "solution sales",
            "pre-sales",
            "sales engineer",
            "sales operations",
            "sales enablement",
            "sales analyst",
            "sales development",
            "sales development representative",
            "sdr",
            "lead generation",
            "lead gen",
            "business growth",
            "partnership development"
        ],
        "Finance & Legal": [
            // Finance & Accounting
            "finance",
            "financial",
            "financial analyst",
            "financial controller",
            "accounting",
            "accountant",
            "accounts",
            "bookkeeping",
            "bookkeeper",
            "fp&a",
            "audit",
            "auditor",
            "internal audit",
            "statutory audit",
            "tax",
            "taxation",
            "gst",
            "income tax",
            "corporate tax",
            "actuarial",
            "pricing",
            "valuation",
            "treasury",
            "cash management",
            "payroll",
            "budget",
            "budgeting",
            "forecasting",
            "cost accounting",
            "cost analyst",
            "financial planning",
            "investment",
            "investment analyst",
            "portfolio manager",
            "equity research",
            "fund manager",
            "mutual funds",
            "private equity",
            "venture capital",
            "vc",
            "hedge funds",
            "asset management",
            "investment banking",
            "strategy",
            "strategic finance",
            "risk",
            "risk management",
            "credit risk",
            "market risk",
            "fraud analyst",
            "collections",
            "underwriter",
            "loan officer",

            // Legal & Compliance
            "legal",
            "lawyer",
            "attorney",
            "counsel",
            "corporate counsel",
            "legal counsel",
            "corporate law",
            "legal associate",
            "paralegal",
            "compliance",
            "compliance officer",
            "regulatory",
            "regulatory affairs",
            "legal advisor",
            "legal analyst",
            "filing",
            "litigation",
            "arbitration",
            "contract manager",
            "contract specialist",
            "intellectual property",
            "ip law",
            "patent attorney",
            "trademark attorney",
            "company secretary",
            "cs",
            "corporate governance",
            "policy",
            "policy analyst",
            "ethics",
            "anti-money laundering",
            "aml",
            "kyc"
        ],
        "Human Resources": [
            // Core HR
            "hr",
            "human resource",
            "human resources",
            "people",
            "people operations",
            "people ops",
            "people partner",
            "hrbp",
            "hr business partner",
            "hr executive",
            "hr manager",
            "hr assistant",
            "hr coordinator",
            "hr officer",
            "hr director",
            "chief people officer",
            "cpo",
            "personnel",

            // Recruitment & Talent
            "recruitment",
            "recruiter",
            "talent",
            "talent acquisition",
            "ta",
            "sourcing specialist",
            "headhunter",
            "campus recruiter",
            "technical recruiter",
            "non-technical recruiter",
            "staffing",
            "staffing specialist",
            "resource manager",
            "resourcing",
            "manpower planning",

            // Training & Development
            "training",
            "trainer",
            "learning",
            "learning and development",
            "l&d",
            "employee development",
            "training coordinator",
            "training manager",
            "training specialist",
            "onboarding",
            "orientation",

            // Employee Engagement & Relations
            "employee engagement",
            "employee relations",
            "er",
            "workforce planning",
            "organizational development",
            "od",
            "culture manager",
            "diversity and inclusion",
            "d&i",
            "compensation and benefits",
            "comp & ben",
            "payroll",
            "hr compliance",
            "hr analytics",
            "hr data analyst"
        ],
        "Operations": [
            "operations",
            "operational",
            "ops",
            "bizops",
            "business operations",
            "fleet",
            "fleet manager",
            "supervisor",
            "shift supervisor",
            "team lead",
            "coordinator",
            "operations coordinator",
            "operations manager",
            "general manager",
            "plant manager",
            "factory manager",
            "logistics",
            "logistics manager",
            "process",
            "process manager",
            "process improvement",
            "workflow",
            "efficiency",
            "planning",
            "production planning",
            "inventory",
            "inventory manager",
            "supply chain",
            "supply chain manager",
            "supply planning",
            "warehousing",
            "warehouse manager",
            "procurement",
            "purchasing",
            "purchasing manager",
            "vendor",
            "vendor management",
            "vendor coordinator",
            "materials manager",
            "quality control",
            "qc",
            "quality assurance",
            "qa",
            "operations analyst",
            "project operations",
            "program operations"
        ],
        "Support & Customer Experience": [
            "support",
            "customer service",
            "customer support",
            "client service",
            "client support",
            "helpdesk",
            "help desk",
            "call center",
            "bpo",
            "service desk",
            "service representative",
            "service coordinator",
            "technical support",
            "technical support engineer",
            "tech support",
            "onboarding",
            "customer onboarding",
            "customer care",
            "customer experience",
            "cx",
            "customer relations",
            "client relations",
            "relationship manager",
            "after sales",
            "post sales",
            "account support",
            "support specialist",
            "support engineer",
            "support associate",
            "support executive",
            "service manager"
        ]
    };

    // Function to extract experience range
    /**
    * Extracts and formats experience requirements with focus on "years of experience" patterns
    * @param {string} desc - Job description text
    * @returns {string} Formatted experience range or default text
    */
    function extractExperience(desc, job = {}) {
        if (!desc) return "Not specified";

        if (job.experience) return;

        // If job object already has experience string, return it
        if (job.experience && typeof job.experience === "string" && job.experience.trim() !== "") {
            return job.experience.trim();
        }

        // Match patterns like "3-5 years", "2+ years", "at least 4 years", etc.
        const numRegex = /(\d+)\s*[-to]{0,3}\s*(\d*)\s*(?:\+?\s*)?(?:years?|yrs?)/i;
        const match = desc.match(numRegex);

        if (match) {
            const min = parseInt(match[1]);
            let max = match[2] ? parseInt(match[2]) : null;

            // If format was like "5+ years", convert to "5-7 yrs"
            if (!max && /\+/.test(desc)) {
                max = min + 2;
            }

            return max ? `${min}-${max} yrs` : `${min} yrs`;
        }

        // Match words for numbers (e.g., "three years", "three to five years")
        const wordToNum = {
            one: 1, two: 2, three: 3, four: 4, five: 5,
            six: 6, seven: 7, eight: 8, nine: 9, ten: 10
        };
        const wordRegex = new RegExp(
            `\\b(${Object.keys(wordToNum).join("|")})\\b\\s+(?:to\\s+(${Object.keys(wordToNum).join("|")})\\s+)?years?`,
            "i"
        );
        const wordMatch = desc.match(wordRegex);

        if (wordMatch) {
            const min = wordToNum[wordMatch[1].toLowerCase()];
            let max = wordMatch[2] ? wordToNum[wordMatch[2].toLowerCase()] : null;

            // If format was like "five+ years", assume +2 years
            if (!max && /\+/.test(desc)) {
                max = min + 2;
            }

            return max ? `${min}-${max} yrs` : `${min} yrs`;
        }

        return "Not specified";
    }

    // Preprocess job description:
    // function cleanDescription(desc) {
    //     if (!desc) return '';

    //     return desc
    //         .replace(/\r\n/g, '\n')                 // normalize line endings
    //         .replace(/\t+/g, ' ')                   // remove tabs
    //         .replace(/[ ]{2,}/g, ' ')               // collapse multiple spaces
    //         .replace(/\n{3,}/g, '\n\n')             // collapse 3+ newlines into 2
    //         .split('\n')
    //         .map(line => line.trim())
    //         .filter(line => !/^(\*|•|-|—)?\s*$/.test(line)) // remove lines that are only bullets or dashes
    //         .trim();
    // }

    function cleanDescription(desc) {
        if (!desc) return '';

        return desc
            .split('\n')                       // keep line breaks
            .map(line => line.trim())          // trim spaces from each line
            .filter(line => line.length > 0)   // remove empty lines
            .join('\n');                       // join back with preserved formatting
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

        return Array.from(foundSkills);
    };

    // Get job type.
    const extractJobType = (desc, experience) => {
        if (!desc) return "Full Time";
        const lower = desc.toLowerCase();

        if (experience <= 1 && (lower.includes("internship") || lower.includes("intern"))) {
            return "Internship";
        }

        if (lower.includes("full time") || lower.includes("full-time")) return "Full Time";
        if (lower.includes("part time") || lower.includes("part-time")) return "Part Time";
        if (lower.includes("contract")) return "Contract";
        if (lower.includes("permanent")) return "Permanent";
        if (lower.includes("temporary")) return "Temporary";
        if (lower.includes("freelance")) return "Freelance";
        if (lower.includes("consultant")) return "Consultant";

        return "Full Time";
    };


    // Get city
    const extractCity = (location) => {
        if (!location || location.trim().toLowerCase() === "not specified") return "India";

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

        return "India";
    };


    function isEntryLevelJob(title, experience) {
        const normalizedTitle = title.toLowerCase();

        const seniorityKeywords = [
            "sr\\.?\\b", "senior\\b", "lead\\b", "director\\b", "head\\b", "vp\\b", "chief\\b",
            "principal\\b", "manager\\b", "architect\\b", "president\\b", "executive\\b",
            "expert\\b", "specialist\\b", "consultant\\b", "supervisor\\b", "officer\\b",
            "owner\\b", "founder\\b", "co-founder\\b", "sde\\s*2\\b", "sde\\s*3\\b", "\\bii\\b"
        ];

        // Reject if title contains seniority indicators
        if (seniorityKeywords.some(keyword => new RegExp(keyword, "i").test(normalizedTitle))) {
            return false;
        }

        // Positive entry-level hints
        const entryKeywords = ["fresher", "graduate", "trainee", "intern", "apprentice"];
        if (entryKeywords.some(keyword => normalizedTitle.includes(keyword))) {
            return true;
        }

        // If no experience info or explicitly "not specified", assume entry level
        if (!experience || experience.trim().toLowerCase() === "not specified") {
            return true;
        }

        // Match experience like "0-2", "1-2", "0 to 2", "2 years", etc.
        const match = experience.match(/(\d+)(?:\s*[-to]{1,3}\s*(\d+))?/i);
        if (!match) return false;

        const min = parseInt(match[1], 10);
        const max = match[2] ? parseInt(match[2], 10) : min;

        // Treat <= 2 years as entry-level
        return max <= 2;
    }


    // Catergorise job into different sectors
    function categorizeJob(title, description) {
        const normalizedTitle = (title || "").toLowerCase();

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

    // Get miniExperience and maxExperience fields:
    function parseExperience(expString = "") {
        if (!expString) {
            return { miniExperience: null, maxExperience: null };
        }

        // Normalize input
        let str = expString.toLowerCase().trim();

        // Remove words like "yrs", "years", "year", "experience"
        str = str.replace(/(yrs?|years?|experience)/g, "").trim();

        let miniExperience = null;
        let maxExperience = null;

        // Case 1: Range (e.g., "2-3", "0 - 1")
        const rangeMatch = str.match(/(\d+)\s*-\s*(\d+)/);
        if (rangeMatch) {
            miniExperience = parseInt(rangeMatch[1], 10);
            maxExperience = parseInt(rangeMatch[2], 10);
            return { miniExperience, maxExperience };
        }

        // Case 2: "10+"
        const plusMatch = str.match(/(\d+)\s*\+/);
        if (plusMatch) {
            miniExperience = parseInt(plusMatch[1], 10);
            maxExperience = null; // open-ended
            return { miniExperience, maxExperience };
        }

        // Case 3: Single number (e.g., "3")
        const singleMatch = str.match(/(\d+)/);
        if (singleMatch) {
            miniExperience = parseInt(singleMatch[1], 10);
            maxExperience = parseInt(singleMatch[1], 10);
            return { miniExperience, maxExperience };
        }

        // Default (not found)
        return { miniExperience: null, maxExperience: null };
    }


    return {
        ...job,
        description: cleanDescription(job.description),
        skills: extractSkills(cleanDescription(job.description)),
        experience: extractExperience(cleanDescription(job.description)),
        sector: categorizeJob(job.title, cleanDescription(job.description)),
        isEntryLevel: isEntryLevelJob(job.title, cleanDescription(job.description)),
        jobType: extractJobType(cleanDescription(job.description), extractExperience(cleanDescription(job.description))),
        location: extractCity(job.location) || 'India',
        ...parseExperience(extractExperience(cleanDescription(job.description))),
        postedAt: getISOTimestamp()
    };
}
