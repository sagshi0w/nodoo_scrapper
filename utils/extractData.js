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
        , 'Object-Oriented Programming (OOP)'
        , 'Design Patterns'
        , 'Clean Code'
        , 'MVC'
        , 'Agile'
        , 'Scrum'
        , 'Kanban'
        , 'Jira'
        , 'Trello'
        , 'XML'
        , 'HTML5'
        , 'Bootstrap'
        , 'Python'
        , 'SQL'
        , 'Pandas'
        , 'NumPy'
        , 'Matplotlib'
        , 'Seaborn'
        , 'Scikit-learn'
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
        , 'ELK Stack'
        , 'Elasticsearch'
        , 'Logstash'
        , 'Kibana'
        , 'Splunk'
        , 'Nagios'
        , 'Incident Management'
        , 'On,call Rotation'
        , 'Load Balancing'
        , 'High Availability (HA)'
        , 'Disaster Recovery'
        , 'Monitoring & Alerting'
        , 'Infrastructure as Code',
        , 'IaC'
        , 'Configuration Management'
        , 'System Architecture'
        , 'Network Security'
        , 'SSL'
        , 'TLS'
        , 'DNS Management'
        , 'Service Mesh'
        , 'Istio'
        , 'SRE Principles'
        , 'SLIs'
        , 'SLOs'
        , 'SLAs'
        , 'Blue,Green Deployment'
        , 'Canary Releases'
        , 'Log Aggregation'
        , 'Network Security'
        , 'Firewalls'
        , 'IDS'
        , 'IPS'
        , 'SIEM'
        , 'Splunk'
        , 'QRadar'
        , 'LogRhythm'
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
        , 'IAM'
        , 'Identity and Access Management'
        , 'OAuth'
        , 'SAML'
        , 'JWT'
        , 'DevSecOps'
        , 'Security Auditing'
        , 'Forensics'
        , 'Log Analysis'
        , 'Firewall Management'
        , 'SSL/TLS'
        , 'Data Loss Prevention'
        , 'ISO 27001'
        , 'NIST Framework'
        , 'Risk Management'
        , 'Security Compliance'
        , 'Governance'
        , 'Risk and Compliance'
        , 'GRC'
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
        , 'Cross Browser Testing'
        , 'Regression Testing'
        , 'Smoke Testing'
        , 'Sanity Testing'
        , 'Integration Testing'
        , 'Unit Testing'
        , 'System Testing'
        , 'End to End Testing'
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
        , 'Cucumber'
        , 'Gherkin'
        , 'BDD'
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
        , 'Objective C'
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
        , 'Dependency Injection'
        , 'JUnit'
        , 'Hilt'
        , 'Dagger'
        , 'Koin'
        , 'Espresso'
        , 'Mockito'
        , 'XCTest'
        , 'Appium'
        , 'Firebase Test Lab'
        , 'Debugging Tools'
        , 'Crashlytics'
        , 'CI/CD'
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
        , 'Binance Smart Chain'
        , 'Solana'
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
        , 'MetaMask'
        , 'WalletConnect'
        , 'Connect Wallet'
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
        , 'Oracle'
        , 'Gas Optimization'
        , 'Auditing Tools'
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
        , 'CI/CD'
        , 'Node Deployment'
        , 'RPC Management'
        , 'WCAG'
        , 'Visual Studio'
        , 'VBScript'
        , 'VB.NET'
        , '.NET'
        , 'RPA'
        , 'Process Automation'
        , 'System Integration'
        , 'SDLC'
        , 'SQL Server'
        , 'SQL Server 2012'
        , 'C#'
        , 'C++'
        , 'Embedded C'
        , 'Python'
        , 'Assembly Language'
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
        , 'SWD'
        , 'Serial Wire Debug'
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
        , 'OKRs'
        , 'KPIs'
        , 'Stakeholder Management'
        , 'Product Lifecycle Management'
        , 'Go,to,Market Strategy'
        , 'User Onboarding Optimization'
        , 'Conversion Rate Optimization'
        , 'CRO)'
        , 'Customer Journey Mapping'
        , 'Figma'
        , 'JIRA'
        , 'Notion'
        , 'Mixpanel'
        , 'Amplitude'
        , 'GA'
        , 'Product Analytics'
        , 'User Interface (UI)'
        , 'User Experience (UX)'
        , 'UI'
        , 'UX'
        , 'Design Systems'
        , 'Component,Based Design'
        , 'Interaction Design'
        , 'Information Architecture'
        , 'Accessibility (WCAG)'
        , 'Responsive Design'
        , 'Mobile,First Design'
        , 'Prototyping'
        , 'Prototypes'
        , 'visualizations'
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
        , 'HubSpot'
        , 'Mailchimp'
        , 'CRM Tools'
        , 'Social Media Strategy'
        , 'Instagram Growth'
        , 'Twitter/X Marketing'
        , 'LinkedIn Content Strategy'
        , 'Influencer Marketing'
        , 'Brand Positioning'
        , 'Community Building'
        , 'User Generated Content'
        , 'UGC'
        , 'Reels/Shorts Marketing'
        , 'Video Marketing'
        , 'Growth Loops'
        , 'Referral Programs'
        , 'Viral Campaigns'
        , 'Retention Marketing'
        , 'Lifecycle Marketing'
        , 'Onboarding Funnels'
        , 'User Activation Strategies'
        , 'App Store Optimization'
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
        , 'Lusha'
        , 'RocketReach'
        , 'Google Workspace'
        , 'Slack for Sales'
        , 'Calendly'
        , 'Notion'
        , 'Excel'
        , 'Google Sheets'
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
        , 'Lusha'
        , 'RocketReach'
        , 'Google Workspace'
        , 'Slack for Sales'
        , 'Calendly'
        , 'Notion'
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
        , 'SLAs'
        , 'Service,Level Agreements'
        , 'RevOps'
        , 'Revenue Operations'
        , 'SalesOps'
        , 'Sales Operations'
        , 'Customer Operations'
        , 'People Operations'
        , 'HR Ops'
        , 'Facility Management'
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
        , 'TradeGecko'
        , 'Unleashed'
        , 'Inventory Software'
        , 'TMS'
        , 'WMS'
        , 'Financial Analysis'
        , 'Financial Modelling'
        , 'Budgeting'
        , 'Forecasting'
        , 'GAAP'    
        , 'IFRS'
        , 'Accounting Principles'
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
        , 'Mergers & Acquisitions'
        , 'Equity & Debt Financing'
        , 'Startup Finance'
        , 'Investor Relations'
        , 'Fundraising Strategy'
        , 'Valuation Techniques'
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
        , 'Intellectual Property'
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
        , 'Contract Lifecycle Management'
        , 'CLM'
        , 'Tally'
        , 'Zoho Books'
        , 'QuickBooks'
        , 'Xero'
        , 'SAP'
        , 'Oracle Financials'
        , 'MS Power BI'
        , 'Tableau'
        , 'DocuSign'
        , 'Ironclad'
        , 'ContractWorks'
        , 'CLM Tools'
        , 'Legal Tech Platforms'
        , 'VComply'
        , 'LogicGate'
        , 'Compliance Tools'
        , 'Tax Filing Platforms'
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
        , 'Survey Tools'
        , 'CultureAmp'
        , 'Officevibe'


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
        , 'Service,Level Agreement Handling'
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
        , 'Communication skills'
        , 'Influence skills'
        , 'Decision Making skills'
        , 'Problem Solving skills'
        , 'Execution skills'
        , 'Reasoning skills'
        , 'Computer skills'
        , 'Administrative skills'
        , 'Analytical skills'
        , 'Leadership skills'
        , 'ML/Statistical models'
        , 'Problem framing'
        , 'Metrics development'
        , 'Data extraction'
        , 'Manipulation'
        , 'Visualization'
        , 'SMax'
        , 'Business Requirements'
        , 'Solution Design Documentation'
        , 'Technical Design Documentation'
        , 'Support Documentation'
        , 'Architecture Diagrams'
        , 'Team collaboration'
        , 'Work Orders'
        , 'Service Contracts'
        , 'Installed Assets'
        , 'Technicians'
        , 'Data Design Skillset'
        , 'Data Design'
        , 'Auto Layout'
        , 'VBA Programming'
        , 'Segmentation'
        , 'Consumer behaviors'
        , 'Consumer experience'
        , 'Appropriate software programs / modules'
        , 'Functional and technical designing'
        , 'Programming languages'
        , 'DBMS'
        , 'Operating Systems and software platforms'
        , 'Software Development Life Cycle'
        , 'Agile – Scrum or Kanban Methods'
        , 'Integrated development environment'
        , 'IDE'
        , 'Rapid application development'
        , 'RAD'
        , 'Modelling technology and languages'
        , 'Interface definition languages'
        , 'IDL'
        , 'PCF'
        , 'Google Cloud Platform'
        , 'NOSQL'
        , 'Couchbase'
        , 'Cassandra'
        , 'Teradata SQL'
        , 'BTEQ scripting'
        , 'Teradata utilities'
        , 'Teradata Studio'
        , 'Data warehousing'
        , 'Dimensional modeling'
        , 'ETL'
        , 'Data modeling'
        , 'Data loading strategies'
        , 'Database design and development'
        , 'SQL optimization'
        , 'Stored procedures'
        , 'Macros'
        , 'Performance tuning'
        , 'System monitoring'
        , 'Troubleshooting'
        , 'Teradata'
        , 'ETL tools'
        , 'Informatica'
        , 'Talend'
        , 'Unix'
        , 'Linux'
        , 'Shell scripting'
        , 'Site Reliability Engineering'
        , 'SRE'
        , 'Incident Management'
        , 'Problem Management'
        , 'Root Cause Analysis'
        , 'RCA'
        , 'Requirement Gap Analysis'
        , 'Monitoring & Observability'
        , 'Automation of manual tasks'
        , '360-degree monitoring solutions'
        , 'Dynatrace Managed'
        , 'Grafana'
        , 'Moog'
        , 'PagerDuty'
        , 'ServiceNow'
        , 'Confluence'
        , 'Microsoft Office Suite'
        , 'Zeke'
        , 'Stonebranch'
        , 'Autosys'
        , 'Airflow'
        , 'ITIL Principles'
        , 'SRE Best Practices'
        , 'DevOps Culture'
        , 'Continuous Improvement'
        , 'Process Automation'
        , 'System Reliability & Availability'
        , 'Monitoring and Alerting Strategy'
        , 'Machine Learning'
        , 'Data-Driven Technologies'
        , 'Root Cause Analysis for Marketplace Metrics'
        , 'Data Engineering'
        , 'Scalable ML Systems Design'
        , 'ML Model Development and Deployment'
        , 'Model Optimization and Productization'
        , 'Reusable and Maintainable ML Pipelines'
        , 'End-to-End ML Lifecycle Management'
        , 'Software Engineering for Data Products'
        , 'Marketplace Metrics Analysis'
        , 'Business Metrics Explainability'
        , 'Data-Driven Decision Making'
        , 'Experimentation'
        , 'A/B Testing'
        , 'Causal Inference'
        , 'Data Visualization and Interpretability'
        , 'Predictive Modeling'
        , 'Statistical Analysis'
        , 'Feature Engineering'
        , 'Model Evaluation and Monitoring'
        , 'Scala'
        , 'TensorFlow'
        , 'PyTorch'
        , 'MLflow'
        , 'Kubeflow'
        , 'Spark'
        , 'Hadoop'
        , 'Kubernetes'
        , 'Docker'
        , 'BigQuery'
        , 'Snowflake'
        , 'Redshift'
        , 'REST APIs and Microservices for ML integration'
        , 'Functional Support'
        , 'L1 Support'
        , 'Global Finance Applications Support'
        , 'System Maintenance & Monitoring'
        , 'RUN support'
        , 'Incident Management & Ticket Resolution'
        , 'Issue Escalation and Root Cause Identification'
        , 'Application Troubleshooting'
        , 'End-User Support and Guidance'
        , 'Process Improvement and Optimization'
        , 'Documentation and Knowledge Base Updates'
        , 'Oracle Financials'
        , 'ERP'
        , 'My Expenses'
        , 'Accounts Payable Workflow'
        , 'Webcollect'
        , 'iSOW'
        , 'Statement of Work system'
        , 'Finance Systems Integration'
        , 'Financial Process Automation'
        , 'Reconciliation and Reporting Support'
        , 'Oracle ERP'
        , 'Oracle Fusion'
        , 'AP Workflow Tools'
        , 'Expense Management Systems'
        , 'Accounts Payable'
        , 'Expense Management'
        , 'Financial Operations'
        , 'Reconciliation Processes'
        , 'Financial Controls and Compliance'
        , 'Month-end and Year-end Support'
        , 'General Ledger Understanding'
        , 'GL'
        , 'Bid Management'
        , 'Proposal Management'
        , 'Deal Management'
        , 'RFP'
        , 'RFQ'
        , 'RFI Response Management'
        , 'Solution Storyboarding and Win Theme Development'
        , 'Deal Strategy and Planning'
        , 'Proposal Defense'
        , 'Orals Support'
        , 'Contracting and Deal Closure Coordination'
        , 'Pricing and Commercial Discussions'
        , 'Solution Validation and Optimization'
        , 'Stakeholder Management'
        , 'Quality and Process Compliance'
        , 'Risk Identification and Mitigation'
        , 'Client Presentation and Communication'
        , 'IT Solutioning'
        , 'Project Management'
        , 'Service Management'
        , 'Applications Outsourcing'
        , 'Managed Services'
        , 'Staff Augmentation Solutioning'
        , 'Enterprise Solutions'
        , 'Understanding of IT Pricing Models'
        , 'Deal Storyboarding and Value Proposition Development'
        , 'Competitive Analysis and Win Strategy Formulation'
        , 'Pricing Models'
        , 'Win Themes'
        , 'Storyboarding'
        , 'Value Proposition'
        , 'Cloud'
        , 'AI'
        , 'Digital Transformation'
        , 'Microsoft Excel'
        , 'PowerPoint'
        , 'Communication'
        , 'Collaboration'
        , 'Process Compliance'
        , 'Risk Management'
        , 'Finance Application Support'
        , 'Global Finance'
        , 'Process Improvement'
        , 'Delivery Centre'
        , 'Finance Systems'
        , 'Financial Controls'
        , 'Retention marketing'
        , 'Lifecycle marketing'
        , 'Customer retention strategy'
        , 'CRM marketing'
        , 'Email marketing'
        , 'SMS marketing'
        , 'WhatsApp marketing'
        , 'Push notifications'
        , 'Segmentation & personalization'
        , 'Behavioral triggers'
        , 'Campaign management'
        , 'Journey optimization'
        , 'Cohort analysis'
        , 'Customer journey mapping'
        , 'Churn reduction strategies'
        , 'LTV optimization'
        , 'Win-back campaigns'
        , 'Loyalty programs'
        , 'Revenue attribution & ROI tracking'
        , 'Customer segmentation & analytics'
        , 'Funnel optimization'
        , 'Campaign performance analysis'
        , 'Strategic planning'
        , 'Experimentation mindset'
        , 'Retention frameworks & playbooks'
        , 'KPI setting & success metrics'
        , 'CleverTap'
        , 'MoEngage'
        , 'WebEngage'
        , 'Klaviyo'
        , 'Email/SMS automation tools'
        , 'CRM & analytics platforms'
        , 'Google Sheets'
        , 'Excel for reporting'
        , 'Merchant enablement'
        , 'Client training'
        , 'D2C marketing'
        , 'Retention frameworks'
        , 'Customer loyalty'
        , 'Behavioral marketing'
        , 'Product-led growth'
        , 'AI-driven personalization'
        , 'Scalable retention systems'
        , 'Playbook creation'
        , 'Program management'
        , 'Government relations'
        , 'Public sector program execution'
        , 'Strategic planning and execution'
        , 'Milestone tracking & reporting'
        , 'Compliance and regulatory alignment'
        , 'Infrastructure readiness coordination'
        , 'Operations management'
        , 'Budget and resource planning'
        , 'Field-level coordination'
        , 'Vendor and partner management'
        , 'Artificial Intelligence'
        , 'GenAI'
        , 'Generative AI'
        , 'Digital infrastructure projects'
        , 'IT systems & data management'
        , 'Government technology deployments'
        , 'Sovereign foundation models'
        , 'Data security & privacy protocols'
        , 'National digital infrastructure missions'
        , 'Secure operations management'
        , 'Software Asset Management'
        , 'SAM'
        , 'SAM lifecycle management'
        , 'License compliance & governance'
        , 'Software license audits'
        , 'Asset lifecycle management'
        , 'Entitlement management'
        , 'Contract validation'
        , 'Risk identification & mitigation'
        , 'Software procurement alignment'
        , 'Continuous process improvement'
        , 'Policy and standards development'
        , 'Flexera'
        , 'Snow License Manager'
        , 'ServiceNow SAM Pro'
        , 'CMDB'
        , 'Configuration Management Database'
        , 'ITSM'
        , 'IT Service Management platforms'
        , 'Procurement and finance system integration'
        , 'Automated discovery & normalization tools'
        , 'Dashboard creation'
        , 'Compliance and optimization reports'
        , 'License cost analysis'
        , 'Software usage insights'
        , 'Executive summaries for decision-making'
        , 'Corporate law'
        , 'Contract drafting, review, and negotiation'
        , 'Commercial agreements'
        , 'Regulatory compliance'
        , 'Regulatory compliance'
        , 'Data privacy & protection laws'
        , 'Employment and labor law'
        , 'Corporate governance'
        , 'Legal policy development'
        , 'Risk management & mitigation'
        , 'Dispute resolution & litigation coordination'
        , 'Intellectual property'
        , 'Cross-border contract structuring'
        , 'International compliance'
        , 'Multi-jurisdictional regulatory frameworks'
        , 'Global expansion legal support'
        , 'Collaboration with international counsel'
        , 'Legal due diligence for foreign partnerships'
        , 'E&M Coding'
        , 'Medical Coding'
        , 'ICD'
        , 'CPT'
        , 'HCPCS'
        , 'Healthcare Documentation Review'
        , 'Diagnosis & Procedure Coding'
        , 'Clinical Statement Analysis'
        , 'Medical Terminology'
        , 'Human Anatomy & Physiology'
        , 'Uniform Medical Documentation Standards'
        , 'Customer Service'
        , 'Technical Support'
        , 'IT Service Desk'
        , 'Request Management'
        , 'VDI'
        , 'Active Directory'
        , 'VPN'
        , 'OneDrive'
        , 'User Device Management'
        , 'Authentication'
        , 'TeamViewer'
        , 'LogMeIn'
        , 'Bomgar'
        , 'Ticketing Tools'
        , 'First Call Resolution'
        , 'International Support'
        , 'Email Etiquette'
        , 'Phone Etiquette'
        , 'Policy Validation'
        , 'Record Verification'
        , 'Compliance Management'
        , 'SOX Compliance'
        , 'Audit Support'
        , 'Stakeholder Communication'
        , 'Decision Making'
        , 'MS Excel'
        , 'MS Word'
        , 'MS PowerPoint'
        , 'Time Management'
        , 'Attention to Detail'
        , 'Change Agility'
        , 'Performance Execution'
        , 'Analytical Skills'
        , 'Project Coordination'
        , 'Client Onboarding'
        , 'SaaS Implementation'
        , 'Technical Implementation'
        , 'Customer Success'
        , 'Requirement Gathering'
        , 'Scope Definition'
        , 'Project Documentation'
        , 'Task Management'
        , 'Prioritization'
        , 'Organizational Skills'
        , 'Quality Assurance'
        , 'Cross-functional Coordination'
        , 'Agile Methodology'
        , 'Remote Work'
        , 'Customer Relationship Management'
        , 'Project Planning'
        , 'Documentation Management'
        , 'Flutter'
        , 'Dart'
        , 'iOS Deve'
        , 'Teamceter'
        , 'BMIDE'
        , 'server tier'
        , 'client tier'
        , 'rac'
        , 'ITK'
        , 'SOA'

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
        // If job.experience exists as number or string, convert to number
        if (job.experience != null) {
            const expNum = Number(job.experience);
            if (!isNaN(expNum)) return { min: expNum, max: expNum };
        }

        if (!desc || typeof desc !== 'string') return { min: null, max: null };

        // Match patterns like "3-5 years", "2+ years", "at least 4 years"
        const numRegex = /(\d+)\s*(?:[-to]{0,3})\s*(\d*)\s*\+?\s*(?:years?|yrs?)/i;
        const match = desc.match(numRegex);

        if (match) {
            const min = parseInt(match[1]);
            let max = match[2] ? parseInt(match[2]) : null;

            if (!max && /\+/.test(desc)) max = min + 2; // e.g., "5+ years" => 5-7

            return { min, max: max || min };
        }

        // Match words for numbers like "three to five years"
        const wordToNum = {
            one: 1, two: 2, three: 3, four: 4, five: 5,
            six: 6, seven: 7, eight: 8, nine: 9, ten: 10
        };
        const wordRegex = new RegExp(
            `\\b(${Object.keys(wordToNum).join("|")})\\b\\s*(?:to\\s*(${Object.keys(wordToNum).join("|")})\\s*)?years?`,
            "i"
        );
        const wordMatch = desc.match(wordRegex);

        if (wordMatch) {
            const min = wordToNum[wordMatch[1].toLowerCase()];
            let max = wordMatch[2] ? wordToNum[wordMatch[2].toLowerCase()] : null;

            if (!max && /\+/.test(desc)) max = min + 2;

            return { min, max: max || min };
        }

        return { min: null, max: null };
    }

    function cleanDescription(desc) {
        // Return description exactly as provided (no cleaning) if present
        return desc || '';
    }


    // Enhanced skill extraction with context awareness
    const extractSkills = (desc) => {
        if (!desc) return [];

        const foundSkills = new Set();

        // Normalize separators and spacing (e.g., UI/UX, UI-UX -> UI UX)
        const normalizedDesc = String(desc)
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/[\/\-]/g, ' ')
            .replace(/\s+/g, ' ');
        const lowercaseDesc = normalizedDesc.toLowerCase();

        // Aliases map variations to canonical skills already in commonSkills
        // NOTE: keep patterns specific and with boundaries to avoid false positives
        const aliasPatterns = [
            { pattern: /\bui\s*[\/\-]?\s*ux\b/i, targets: ['User Interface (UI)', 'User Experience (UX)'] },
            { pattern: /\bux\s*[\/\-]?\s*ui\b/i, targets: ['User Interface (UI)', 'User Experience (UX)'] },
            { pattern: /\buser\s+interface\b/i, targets: ['User Interface (UI)'] },
            { pattern: /\buser\s+experience\b/i, targets: ['User Experience (UX)'] },
            { pattern: /\badobe\s*xd\b/i, targets: ['Adobe XD'] },
            { pattern: /\badobexd\b/i, targets: ['Adobe XD'] },
            { pattern: /\bvisual\s+studio\s+ide\b/i, targets: ['Visual Studio'] },
            { pattern: /\bvb\s*scripting\b/i, targets: ['VBScript'] },
            { pattern: /\bvbscript\b/i, targets: ['VBScript'] },
            { pattern: /\bvb\.?net\b/i, targets: ['VB.NET'] },
            { pattern: /\b\.net\b/i, targets: ['.NET'] },
            { pattern: /\brpa\b/i, targets: ['RPA'] },
            { pattern: /\bprocess\s+automation\b/i, targets: ['Process Automation'] },
            { pattern: /\bintegration\b/i, targets: ['System Integration'] },
            { pattern: /\bsdlc\b/i, targets: ['SDLC'] },
            { pattern: /\bsql\s*server\s*2012\b/i, targets: ['SQL Server 2012', 'SQL Server'] },
            { pattern: /\bnode\s*js\b/i, targets: ['Node.js'] },
            { pattern: /\bbit\s*bucket\b/i, targets: ['Bitbucket'] }
            // Intentionally omit short aliases like 'js' or 'ts' to prevent overmatching
        ];

        // Remove duplicates from commonSkills array (case-insensitive, prefer first seen casing)
        const canonicalSkillByLower = new Map();
        for (const s of commonSkills) {
            const key = String(s).toLowerCase();
            if (!canonicalSkillByLower.has(key)) canonicalSkillByLower.set(key, s);
        }
        const uniqueSkills = Array.from(canonicalSkillByLower.values());

        function addSkillIfValid(skill, contextText) {
            // Reduce false positives for the word 'Go' (verb) vs language
            if (skill === 'Go') {
                const goOk = /\bgolang\b/i.test(contextText) || /\bgo\s+language\b/i.test(contextText);
                if (!goOk) return;
            }
            foundSkills.add(skill);
        }

        function matchesSkill(contextText, skill) {
            if (!skill || !contextText) return false;
            const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const hasNonWord = /[^A-Za-z0-9\s]/.test(skill);
            if (hasNonWord) {
                // Surround with non-word char or boundaries without relying on \b
                const pattern = `(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`;
                return new RegExp(pattern, 'i').test(contextText);
            } else {
                return new RegExp(`\\b${escaped}\\b`, 'i').test(contextText);
            }
        }

        // 0) Apply alias patterns explicitly with regex boundaries
        aliasPatterns.forEach(({ pattern, targets }) => {
            if (pattern.test(normalizedDesc)) {
                targets.forEach(t => addSkillIfValid(t, normalizedDesc));
            }
        });

        // 1) First look for explicit skills sections
        const skillsSections = normalizedDesc.match(/(?:skills|qualifications|requirements|competencies|technical\s+skills|key\s+skills)[:\s-]+([\s\S]+?)(?:\n\n|\.\s|\n\s*\n|$)/gi);
        if (skillsSections && skillsSections.length > 0) {
            skillsSections.forEach(section => {
                const sectionMatch = section.match(/(?:skills|qualifications|requirements|competencies|technical\s+skills|key\s+skills)[:\s-]+([\s\S]+?)(?:\n\n|\.\s|\n\s*\n|$)/i);
                if (sectionMatch) {
                    const sectionText = sectionMatch[1];
                    uniqueSkills.forEach(skill => {
                        if (matchesSkill(sectionText, skill)) {
                            addSkillIfValid(skill, sectionText);
                        }
                    });
                }
            });
        }

        // 2) Search entire description (exact word match first)
        const exactMatched = new Set();
        uniqueSkills.forEach(skill => {
            if (matchesSkill(normalizedDesc, skill)) {
                addSkillIfValid(skill, normalizedDesc);
                exactMatched.add(skill);
            }
        });

        // 2b) Fallback: controlled morphological variants only (s/es/ing/ed on last token)
        function buildVariantRegexes(skill) {
            if (!skill) return [];
            const safe = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const tokens = skill.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
            if (tokens.length === 0) return [];
            const last = tokens[tokens.length - 1];
            const baseLast = last.replace(/s$/i, "");
            const lastVariants = [last, `${baseLast}s`, `${baseLast}es`, `${baseLast}ing`, `${baseLast}ed`];
            const prefix = tokens.slice(0, -1).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
            const regexes = [];
            lastVariants.forEach(v => {
                const vSafe = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const pattern = prefix ? `\\b${prefix}\\s+${vSafe}\\b` : `\\b${vSafe}\\b`;
                regexes.push(new RegExp(pattern, 'i'));
            });
            return regexes;
        }

        uniqueSkills.forEach(skill => {
            if (exactMatched.has(skill)) return;
            if (String(skill).length < 3) return;
            const variantRegexes = buildVariantRegexes(skill);
            if (variantRegexes.some(rx => rx.test(normalizedDesc))) {
                addSkillIfValid(skill, normalizedDesc);
            }
        });

        // 3) Fallbacks: bullets and comma/semicolon separated lists
        const bulletPoints = normalizedDesc.match(/^[\s]*[•·▪▫‣⁃\-\*]\s*(.+)$/gmi);
        if (bulletPoints) {
            bulletPoints.forEach(point => {
                uniqueSkills.forEach(skill => {
                    if (matchesSkill(point, skill)) {
                        addSkillIfValid(skill, point);
                    }
                });
            });
        }

        const listSegments = normalizedDesc.split(/\n|\.|;/).map(s => s.trim()).filter(Boolean);
        listSegments.forEach(segment => {
            if (/(,| and )/.test(segment)) {
                uniqueSkills.forEach(skill => {
                    if (matchesSkill(segment, skill)) {
                        addSkillIfValid(skill, segment);
                    }
                });
            }
        });

        // 4) Pattern-based sentences
        const skillPatterns = [
            /(?:experience\s+with|knowledge\s+of|proficient\s+in|familiar\s+with|expertise\s+in)\s+([^.,\n]+)/gi,
            /(?:must\s+have|required|preferred)\s*:?\s*([^.,\n]+)/gi,
            /(?:technologies?|tools?|languages?|frameworks?)\s*:?\s*([^.,\n]+)/gi
        ];
        skillPatterns.forEach(pattern => {
            const matches = normalizedDesc.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    uniqueSkills.forEach(skill => {
                        if (matchesSkill(match, skill)) {
                            addSkillIfValid(skill, match);
                        }
                    });
                });
            }
        });

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

        console.log("location (1471) = ", location);

        // Normalize known aliases before matching
        let lowerLoc = location.toLowerCase();
        lowerLoc = lowerLoc.replace(/bengaluru|bangaluru/g, "Bangalore");
        lowerLoc = lowerLoc.replace(/gurugram/g, "Gurgaon");

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
    function parseExperience(expInput = "") {
        if (!expInput) {
            return { miniExperience: null, maxExperience: null };
        }

        // If already an object with min/max, map directly
        if (typeof expInput === 'object' && expInput !== null) {
            const hasMin = Object.prototype.hasOwnProperty.call(expInput, 'min');
            const hasMax = Object.prototype.hasOwnProperty.call(expInput, 'max');
            if (hasMin || hasMax) {
                return {
                    miniExperience: expInput.min ?? null,
                    maxExperience: expInput.max ?? null
                };
            }
        }

        // Normalize input assuming string-like
        let str = String(expInput).toLowerCase().trim();

        // Remove words like "yrs", "years", "year", "experience"
        str = str.replace(/(yrs?|years?|experience)/g, "").trim();

        let miniExperience = null;
        let maxExperience = null;

        // Case 1: Range (e.g., "2-3", "0 - 1", "4 - 6")
        const rangeMatch = str.match(/(\d+)\s*[-–]\s*(\d+)/);
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


    const cleanedDesc = cleanDescription(job.description);
    const experienceRange = extractExperience(cleanedDesc);
    const experienceString = experienceRange.min != null
        ? (experienceRange.max != null && experienceRange.max !== experienceRange.min
            ? `${experienceRange.min} - ${experienceRange.max} yrs`
            : `${experienceRange.min} - ${experienceRange.min + 2} yrs`)
        : "Not specified";

    // Sector should be an array per schema
    const sectorSingle = categorizeJob(job.title, cleanedDesc);

    return {
        ...job,
        description: cleanedDesc,
        skills: extractSkills(cleanedDesc),
        experience: experienceString,
        sector: sectorSingle ? [sectorSingle] : [],
        isEntryLevel: isEntryLevelJob(job.title, experienceString),
        jobType: extractJobType(cleanedDesc, experienceRange.min ?? null),
        location: extractCity(job.location),
        ...parseExperience(experienceRange),
        postedAt: getISOTimestamp()
    };
}
